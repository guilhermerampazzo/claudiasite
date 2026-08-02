import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery } from "./db.js";

const SOURCE_URL = process.env.CATALOG_SOURCE_URL || "https://casaestampa.com";
const SOURCE_ROOT = SOURCE_URL.replace(/\/$/, "");
const API_URL = `${SOURCE_ROOT}/wp-json/wc/store/v1`;
const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

let catalogReady;

export async function ensureCatalog() {
  if (!catalogReady) catalogReady = initializeCatalog();
  return catalogReady;
}

async function initializeCatalog() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS catalog_categories (
      source_id integer PRIMARY KEY,
      parent_source_id integer,
      name text NOT NULL,
      slug text NOT NULL,
      path text NOT NULL UNIQUE,
      description text NOT NULL DEFAULT '',
      product_count integer NOT NULL DEFAULT 0,
      image_url text NOT NULL DEFAULT '',
      source_url text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS catalog_categories_parent_idx ON catalog_categories(parent_source_id);
    CREATE INDEX IF NOT EXISTS catalog_categories_slug_idx ON catalog_categories(slug);

    CREATE TABLE IF NOT EXISTS catalog_products (
      source_id integer PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      sku text NOT NULL DEFAULT '',
      description text NOT NULL DEFAULT '',
      short_description text NOT NULL DEFAULT '',
      source_url text NOT NULL DEFAULT '',
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS catalog_products_name_idx ON catalog_products(name);

    CREATE TABLE IF NOT EXISTS catalog_product_categories (
      product_source_id integer NOT NULL REFERENCES catalog_products(source_id) ON DELETE CASCADE,
      category_source_id integer NOT NULL REFERENCES catalog_categories(source_id) ON DELETE CASCADE,
      PRIMARY KEY (product_source_id, category_source_id)
    );
    CREATE INDEX IF NOT EXISTS catalog_product_categories_category_idx ON catalog_product_categories(category_source_id);

    CREATE TABLE IF NOT EXISTS catalog_sync_runs (
      id bigserial PRIMARY KEY,
      status text NOT NULL,
      categories_count integer NOT NULL DEFAULT 0,
      products_count integer NOT NULL DEFAULT 0,
      message text NOT NULL DEFAULT '',
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    );
  `);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "CasaEstampaCatalogSync/1.0" } });
  if (!response.ok) throw new Error(`Falha na origem (${response.status}) em ${url}`);
  return { data: await response.json(), headers: response.headers };
}

export async function syncCatalog({ onProgress = () => {}, products = true } = {}) {
  await ensureCatalog();
  const run = await dbQuery("INSERT INTO catalog_sync_runs (status) VALUES ('running') RETURNING id");
  const runId = run.rows[0].id;
  let categoriesCount = 0;
  let productsCount = 0;
  try {
    const categoryResponse = await fetchJson(`${SOURCE_ROOT}/wp-json/wp/v2/product_cat?per_page=100&page=1&hide_empty=false`);
    const storeCategoryResponse = await fetchJson(`${API_URL}/products/categories?per_page=100&page=1`);
    const storeCategoryPages = Number(storeCategoryResponse.headers.get("x-wp-totalpages") || 1);
    const storeCategories = [...storeCategoryResponse.data];
    for (let page = 2; page <= storeCategoryPages; page += 1) {
      storeCategories.push(...(await fetchJson(`${API_URL}/products/categories?per_page=100&page=${page}`)).data);
    }
    const storeCategoryMap = new Map(storeCategories.map((item) => [item.id, item]));
    const totalCategoryPages = Number(categoryResponse.headers.get("x-wp-totalpages") || 1);
    const categories = categoryResponse.data.map((item) => ({ ...item, image: storeCategoryMap.get(item.id)?.image || null }));
    for (let page = 2; page <= totalCategoryPages; page += 1) {
      const pageItems = (await fetchJson(`${SOURCE_ROOT}/wp-json/wp/v2/product_cat?per_page=100&page=${page}&hide_empty=false`)).data;
      categories.push(...pageItems.map((item) => ({ ...item, image: storeCategoryMap.get(item.id)?.image || null })));
    }
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    for (const [index, item] of categories.entries()) {
      const categoryPath = resolveCategoryPath(item, categoryMap);
      await dbQuery(
        `INSERT INTO catalog_categories
          (source_id,parent_source_id,name,slug,path,description,product_count,image_url,source_url,sort_order,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
         ON CONFLICT (source_id) DO UPDATE SET parent_source_id=EXCLUDED.parent_source_id,name=EXCLUDED.name,
           slug=EXCLUDED.slug,path=EXCLUDED.path,description=EXCLUDED.description,product_count=EXCLUDED.product_count,
           image_url=EXCLUDED.image_url,source_url=EXCLUDED.source_url,sort_order=EXCLUDED.sort_order,updated_at=now()`,
        [item.id, item.parent || null, item.name, item.slug, categoryPath, plainText(item.description), item.count || 0, item.image?.src || "", `${SOURCE_ROOT}/categoria-produto/${categoryPath}/`, index]
      );
      categoriesCount += 1;
    }
    onProgress({ phase: "categories", current: categoriesCount, total: categories.length });

    if (!products) {
      const existing = await dbQuery("SELECT count(*)::int total FROM catalog_products");
      productsCount = existing.rows[0].total;
      await dbQuery("UPDATE catalog_sync_runs SET status='complete',categories_count=$2,products_count=$3,finished_at=now() WHERE id=$1", [runId, categoriesCount, productsCount]);
      return { categoriesCount, productsCount };
    }

    const first = await fetchJson(`${API_URL}/products?per_page=100&page=1`);
    const productPages = Number(first.headers.get("x-wp-totalpages") || 1);
    for (let page = 1; page <= productPages; page += 1) {
      const products = page === 1 ? first.data : (await fetchJson(`${API_URL}/products?per_page=100&page=${page}`)).data;
      for (const item of products) {
        await dbQuery(
          `INSERT INTO catalog_products
            (source_id,name,slug,sku,description,short_description,source_url,images,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,now())
           ON CONFLICT (source_id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,sku=EXCLUDED.sku,
             description=EXCLUDED.description,short_description=EXCLUDED.short_description,source_url=EXCLUDED.source_url,
             images=EXCLUDED.images,updated_at=now()`,
          [item.id, item.name, item.slug, item.sku || "", plainText(item.description), plainText(item.short_description), item.permalink || "", JSON.stringify(item.images || [])]
        );
        await dbQuery("DELETE FROM catalog_product_categories WHERE product_source_id=$1", [item.id]);
        const categoryIds = (item.categories || []).map((category) => category.id).filter((id) => categoryMap.has(id));
        if (categoryIds.length) {
          await dbQuery(
            `INSERT INTO catalog_product_categories (product_source_id,category_source_id)
             SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
            [item.id, categoryIds]
          );
        }
        productsCount += 1;
      }
      onProgress({ phase: "products", current: productsCount, total: Number(first.headers.get("x-wp-total") || 0), page, pages: productPages });
    }
    await dbQuery("UPDATE catalog_sync_runs SET status='complete',categories_count=$2,products_count=$3,finished_at=now() WHERE id=$1", [runId, categoriesCount, productsCount]);
    return { categoriesCount, productsCount };
  } catch (error) {
    await dbQuery("UPDATE catalog_sync_runs SET status='failed',categories_count=$2,products_count=$3,message=$4,finished_at=now() WHERE id=$1", [runId, categoriesCount, productsCount, String(error.message || error)]);
    throw error;
  }
}

function resolveCategoryPath(category, map) {
  const parts = [category.slug];
  const visited = new Set([category.id]);
  let parent = map.get(category.parent);
  while (parent && !visited.has(parent.id)) {
    visited.add(parent.id);
    parts.unshift(parent.slug);
    parent = map.get(parent.parent);
  }
  return parts.join("/");
}

function plainText(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "-").replace(/&#8212;|&mdash;/g, "-").replace(/\s+/g, " ").trim();
}

export async function getCatalogStats() {
  await ensureCatalog();
  const result = await dbQuery(`SELECT
    (SELECT count(*)::int FROM catalog_categories WHERE active) categories,
    (SELECT count(*)::int FROM catalog_products WHERE active) products,
    (SELECT row_to_json(r) FROM (SELECT status,categories_count,products_count,message,started_at,finished_at FROM catalog_sync_runs ORDER BY id DESC LIMIT 1) r) last_sync`);
  return result.rows[0];
}

export async function listCatalogCategories({ parentId = null, query = "", limit = 250 } = {}) {
  await ensureCatalog();
  const result = await dbQuery(
    `SELECT c.*, (SELECT count(*)::int FROM catalog_categories child WHERE child.parent_source_id=c.source_id AND child.active) child_count
     FROM catalog_categories c WHERE c.active AND ($1::int IS NULL OR c.parent_source_id=$1)
       AND ($2='' OR c.name ILIKE '%'||$2||'%' OR c.path ILIKE '%'||$2||'%')
     ORDER BY c.sort_order,c.name LIMIT $3`, [parentId, query, limit]);
  return result.rows;
}

export async function getCategoryByPath(categoryPath) {
  await ensureCatalog();
  const result = await dbQuery("SELECT * FROM catalog_categories WHERE path=$1 AND active", [categoryPath]);
  return result.rows[0] || null;
}

export async function listCategoryChildren(sourceId) {
  await ensureCatalog();
  const result = await dbQuery("SELECT * FROM catalog_categories WHERE parent_source_id=$1 AND active ORDER BY sort_order,name", [sourceId]);
  return result.rows;
}

export async function getCatalogSectionCategories(pageSlug) {
  await ensureCatalog();
  const pathByPage = {
    "papeis-de-parede": "papeis-de-parede",
    cortinas: "cortinas",
    persianas: "persianas",
    pisos: "pisos-vinilicos"
  };
  const categoryPath = pathByPage[pageSlug];
  if (!categoryPath) {
    const result = await dbQuery("SELECT *,(SELECT count(*)::int FROM catalog_categories child WHERE child.parent_source_id=catalog_categories.source_id AND child.active) child_count FROM catalog_categories WHERE parent_source_id IS NULL AND active ORDER BY sort_order LIMIT 8");
    return result.rows;
  }
  const parent = await getCategoryByPath(categoryPath);
  if (!parent) return [];
  const result = await dbQuery("SELECT *,(SELECT count(*)::int FROM catalog_categories child WHERE child.parent_source_id=catalog_categories.source_id AND child.active) child_count FROM catalog_categories WHERE parent_source_id=$1 AND active ORDER BY sort_order LIMIT 16", [parent.source_id]);
  return result.rows;
}

export async function listCatalogProducts({ categoryId = null, query = "", page = 1, perPage = 24 } = {}) {
  await ensureCatalog();
  const offset = Math.max(0, page - 1) * perPage;
  const values = [categoryId, query, perPage, offset];
  const where = `p.active AND ($1::int IS NULL OR EXISTS (SELECT 1 FROM catalog_product_categories pc WHERE pc.product_source_id=p.source_id AND pc.category_source_id=$1)) AND ($2='' OR p.name ILIKE '%'||$2||'%' OR p.sku ILIKE '%'||$2||'%')`;
  const [rows, count] = await Promise.all([
    dbQuery(`SELECT p.*, COALESCE((p.images->0->>'thumbnail'),(p.images->0->>'src'),'') image_url,
      COALESCE((SELECT array_agg(pc.category_source_id ORDER BY pc.category_source_id) FROM catalog_product_categories pc WHERE pc.product_source_id=p.source_id),'{}') category_ids
      FROM catalog_products p WHERE ${where} ORDER BY p.name LIMIT $3 OFFSET $4`, values),
    dbQuery(`SELECT count(*)::int total FROM catalog_products p WHERE ${where}`, values.slice(0, 2))
  ]);
  return { products: rows.rows, total: count.rows[0].total, page, perPage };
}

export async function getCatalogProduct(slug) {
  await ensureCatalog();
  const result = await dbQuery(`SELECT p.*,
    COALESCE(json_agg(json_build_object('name',c.name,'path',c.path)) FILTER (WHERE c.source_id IS NOT NULL),'[]') categories
    FROM catalog_products p LEFT JOIN catalog_product_categories pc ON pc.product_source_id=p.source_id
    LEFT JOIN catalog_categories c ON c.source_id=pc.category_source_id WHERE p.slug=$1 AND p.active GROUP BY p.source_id`, [slug]);
  return result.rows[0] || null;
}

export async function updateCatalogCategory(sourceId, values) {
  await ensureCatalog();
  const result = await dbQuery(`UPDATE catalog_categories SET name=$2,description=$3,active=$4,sort_order=$5,image_url=$6,updated_at=now() WHERE source_id=$1 RETURNING *`, [sourceId, String(values.name || "").trim(), String(values.description || "").trim(), values.active !== false, Number(values.sort_order) || 0, String(values.image_url || "").trim()]);
  return result.rows[0] || null;
}

export async function updateCatalogProduct(sourceId, values) {
  await ensureCatalog();
  const imageUrl = String(values.image_url || values.images?.[0]?.src || "").trim();
  const images = imageUrl ? [{ ...(values.images?.[0] || {}), src: imageUrl, thumbnail: imageUrl }] : (values.images || []);
  const result = await dbQuery(`UPDATE catalog_products SET name=$2,sku=$3,description=$4,short_description=$5,active=$6,images=$7::jsonb,updated_at=now() WHERE source_id=$1 RETURNING *`, [sourceId, String(values.name || "").trim(), String(values.sku || "").trim(), String(values.description || "").trim(), String(values.short_description || "").trim(), values.active !== false, JSON.stringify(images)]);
  if (Array.isArray(values.category_ids)) {
    await dbQuery("DELETE FROM catalog_product_categories WHERE product_source_id=$1", [sourceId]);
    const categoryIds = values.category_ids.map(Number).filter(Number.isFinite);
    if (categoryIds.length) await dbQuery("INSERT INTO catalog_product_categories (product_source_id,category_source_id) SELECT $1,unnest($2::int[]) ON CONFLICT DO NOTHING", [sourceId, categoryIds]);
  }
  return result.rows[0] || null;
}

export async function createCatalogCategory(values) {
  await ensureCatalog();
  const parentId = values.parent_source_id ? Number(values.parent_source_id) : null;
  const parent = parentId ? (await dbQuery("SELECT path FROM catalog_categories WHERE source_id=$1", [parentId])).rows[0] : null;
  const slug = slugify(values.slug || values.name);
  if (!slug) return null;
  const source = await dbQuery("SELECT COALESCE(min(source_id),0)-1 id FROM catalog_categories WHERE source_id<=0");
  const sourceId = source.rows[0].id;
  const categoryPath = parent ? `${parent.path}/${slug}` : slug;
  const result = await dbQuery(`INSERT INTO catalog_categories (source_id,parent_source_id,name,slug,path,description,product_count,image_url,active,sort_order) VALUES ($1,$2,$3,$4,$5,$6,0,$7,true,$8) RETURNING *`, [sourceId, parentId, String(values.name || "").trim(), slug, categoryPath, String(values.description || "").trim(), String(values.image_url || "").trim(), Number(values.sort_order) || 0]);
  return result.rows[0];
}

export async function createCatalogProduct(values) {
  await ensureCatalog();
  const slug = slugify(values.slug || values.name);
  if (!slug) return null;
  const source = await dbQuery("SELECT COALESCE(min(source_id),0)-1 id FROM catalog_products WHERE source_id<=0");
  const sourceId = source.rows[0].id;
  const images = values.image_url ? [{ src: String(values.image_url), thumbnail: String(values.image_url), alt: String(values.name || "") }] : [];
  const result = await dbQuery(`INSERT INTO catalog_products (source_id,name,slug,sku,description,short_description,images,active) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,true) RETURNING *`, [sourceId, String(values.name || "").trim(), slug, String(values.sku || "").trim(), String(values.description || "").trim(), String(values.short_description || "").trim(), JSON.stringify(images)]);
  const categoryIds = (values.category_ids || []).map(Number).filter(Number.isFinite);
  if (categoryIds.length) await dbQuery("INSERT INTO catalog_product_categories (product_source_id,category_source_id) SELECT $1,unnest($2::int[]) ON CONFLICT DO NOTHING", [sourceId, categoryIds]);
  return result.rows[0];
}

function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export async function getCatalogMedia(kind, sourceId) {
  await ensureCatalog();
  const isCategory = kind === "categoria";
  const isThumbnail = kind === "miniatura";
  const result = await dbQuery(isCategory ? "SELECT image_url FROM catalog_categories WHERE source_id=$1" : isThumbnail ? "SELECT COALESCE(images->0->>'thumbnail',images->0->>'src','') image_url FROM catalog_products WHERE source_id=$1" : "SELECT COALESCE(images->0->>'src',images->0->>'thumbnail','') image_url FROM catalog_products WHERE source_id=$1", [sourceId]);
  const imageUrl = result.rows[0]?.image_url;
  if (!imageUrl) return null;
  if (imageUrl.startsWith("/uploads/")) {
    const diskPath = path.resolve(uploadRoot, imageUrl.slice("/uploads/".length));
    if (!diskPath.startsWith(path.resolve(uploadRoot))) return null;
    try { return { buffer: await fs.readFile(diskPath), contentType: mediaType(path.extname(diskPath).toLowerCase()) }; }
    catch { return null; }
  }
  if (!imageUrl.startsWith("http")) return null;
  const folder = path.join(uploadRoot, "catalog", isCategory ? "categories" : isThumbnail ? "thumbnails" : "products");
  const extension = path.extname(new URL(imageUrl).pathname).replace(/[^.a-z0-9]/gi, "").slice(0, 6) || ".jpg";
  const diskPath = path.join(folder, `${sourceId}${extension}`);
  try {
    const buffer = await fs.readFile(diskPath);
    return { buffer, contentType: mediaType(extension) };
  } catch {}
  const response = await fetch(imageUrl, { headers: { "user-agent": "CasaEstampaCatalogMedia/1.0" } });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(diskPath, buffer);
  return { buffer, contentType: response.headers.get("content-type") || mediaType(extension) };
}

function mediaType(extension) {
  return extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : extension === ".gif" ? "image/gif" : "image/jpeg";
}

export function catalogImage(kind, sourceId, hasImage = true) {
  return hasImage ? `/catalog-media/${kind}/${sourceId}` : "/assets/logo-icone.svg";
}
