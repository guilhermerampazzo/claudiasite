import pg from "pg";
import {
  GLOBAL_PARTS,
  SOURCE_PAGES,
  buildGlobalPartDocument,
  extractGlobalPart,
  readSourcePage,
  replaceGlobalPart
} from "./source-pages.js";
import { GOOGLE_FONTS, googleFontsStylesheet } from "./editor-options.js";
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from "./site-settings.js";

export { mergeSiteSettings } from "./site-settings.js";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://casaestampa:casaestampa@localhost:5432/casaestampa";

const pool = new Pool({
  connectionString,
  max: 10
});

let ready;

export async function dbQuery(text, params = []) {
  await ensureDatabase();
  return pool.query(text, params);
}

export async function ensureDatabase() {
  if (!ready) {
    ready = initializeDatabase();
  }
  return ready;
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      slug text PRIMARY KEY,
      title text NOT NULL,
      html text NOT NULL,
      original_html text NOT NULL,
      is_home boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE pages
    ADD COLUMN IF NOT EXISTS page_type text NOT NULL DEFAULT 'page';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id bigserial PRIMARY KEY,
      filename text NOT NULL,
      public_path text NOT NULL,
      mime_type text NOT NULL,
      size_bytes integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await seedPages();
  await seedGlobalParts();
  await pool.query(
    `INSERT INTO settings (key, value)
     VALUES ('global', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [
      JSON.stringify(DEFAULT_SITE_SETTINGS)
    ]
  );
}

async function seedPages() {
  for (const page of SOURCE_PAGES) {
    const html = await readSourcePage(page);
    await pool.query(
      `INSERT INTO pages (slug, title, html, original_html, is_home)
       VALUES ($1, $2, $3, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [page.slug, page.title, html, Boolean(page.home)]
    );
  }
}

async function seedGlobalParts() {
  const source = await readSourcePage(SOURCE_PAGES.find((page) => page.home));
  for (const part of GLOBAL_PARTS) {
    const html = buildGlobalPartDocument(source, part);
    await pool.query(
      `INSERT INTO pages (slug, title, html, original_html, is_home, page_type)
       VALUES ($1, $2, $3, $3, false, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [part.slug, part.title, html, part.type]
    );
  }
}

export async function getSettings() {
  const result = await dbQuery("SELECT value FROM settings WHERE key = 'global'");
  return mergeSiteSettings(result.rows[0]?.value);
}

export async function getPageBySlug(slug) {
  const result = await dbQuery(
    "SELECT slug, title, html, original_html, is_home, page_type, updated_at FROM pages WHERE slug = $1",
    [slug]
  );
  return result.rows[0] || null;
}

export async function getHomePage() {
  const result = await dbQuery(
    "SELECT slug, title, html, original_html, is_home, page_type, updated_at FROM pages WHERE is_home = true AND page_type = 'page' LIMIT 1"
  );
  return result.rows[0] || getPageBySlug("amorim");
}

export async function getHomeHeaderHtml() {
  const result = await dbQuery(
    "SELECT html FROM pages WHERE is_home = true AND page_type = 'page' LIMIT 1"
  );
  const homeHtml = result.rows[0]?.html;
  if (!homeHtml) return null;
  return extractGlobalPart(homeHtml, GLOBAL_PARTS.find((part) => part.type === "global_header"));
}

export async function listPages() {
  const result = await dbQuery(
    "SELECT slug, title, is_home, page_type, updated_at FROM pages ORDER BY page_type, is_home DESC, title ASC"
  );
  return result.rows;
}

export async function getGlobalParts() {
  const result = await dbQuery(
    "SELECT slug, page_type, html FROM pages WHERE page_type LIKE 'global_%'"
  );
  return Object.fromEntries(result.rows.map((row) => [row.page_type, row.html]));
}

export async function createPage({ title, slug, templateSlug }) {
  const template = await getPageBySlug(templateSlug);
  if (!template || template.page_type !== "page") return null;
  const safeTitle = String(title).trim().slice(0, 120);
  const html = template.html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(safeTitle)} - Casa Estampa</title>`);
  const result = await dbQuery(
    `INSERT INTO pages (slug, title, html, original_html, is_home, page_type)
     VALUES ($1, $2, $3, $3, false, 'page')
     ON CONFLICT (slug) DO NOTHING
     RETURNING slug, title, html, original_html, is_home, page_type, updated_at`,
    [slug, safeTitle, html]
  );
  return result.rows[0] || null;
}

export async function setHomePage(slug) {
  await ensureDatabase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const target = await client.query(
      "SELECT slug FROM pages WHERE slug = $1 AND page_type = 'page' FOR UPDATE",
      [slug]
    );
    if (!target.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("UPDATE pages SET is_home = false WHERE page_type = 'page'");
    const result = await client.query(
      `UPDATE pages SET is_home = true, updated_at = now() WHERE slug = $1
       RETURNING slug, title, is_home, page_type, updated_at`,
      [slug]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function renderHtml(html, settings = {}, { globalHeaderHtml = null } = {}) {
  const mergedSettings = mergeSiteSettings(settings);
  let rendered = globalHeaderHtml ? replaceGlobalHeader(html, globalHeaderHtml) : html;
  rendered = applySiteChrome(rendered, mergedSettings);

  rendered = rendered.replaceAll(
    "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css",
    "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css"
  );

  const globalCss = buildGlobalCss(mergedSettings);
  const usedFonts = GOOGLE_FONTS.filter((font) => rendered.includes(font) || mergedSettings.fontFamily === font);
  const tags = [];
  if (usedFonts.length) tags.push(`<link id="casa-estampa-google-fonts" rel="stylesheet" href="${googleFontsStylesheet(usedFonts)}">`);
  if (rendered.includes("ti ti-") && !rendered.includes("tabler-icons.min.css")) {
    tags.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css">');
  }
  if (globalCss.trim()) tags.push(`<style id="casa-estampa-global-overrides">${globalCss}</style>`);
  if (!tags.length) return rendered;
  if (rendered.includes("</body>")) return rendered.replace("</body>", `${tags.join("\n")}\n</body>`);
  if (rendered.includes("</head>")) return rendered.replace("</head>", `${tags.join("\n")}\n</head>`);
  return `${tags.join("\n")}\n${rendered}`;
}

function replaceGlobalHeader(html, homeHeaderHtml) {
  const headerPart = GLOBAL_PARTS.find((part) => part.type === "global_header");
  const homeHeader = extractGlobalPart(homeHeaderHtml, headerPart);
  if (!homeHeader) return html;
  return replaceGlobalPart(html, headerPart, homeHeaderHtml);
}

function applySiteChrome(html, settings) {
  let rendered = html;
  rendered = replaceClassElement(rendered, "a", "navbar-logo", (opening) => {
    const linked = setHtmlAttribute(opening, "href", settings.header.logoHref);
    const icon = `<img class="site-logo-icon" src="${escapeAttribute(settings.header.iconSrc)}" alt="">`;
    const lettering = `<img class="site-logo-lettering" src="${escapeAttribute(settings.header.logoSrc)}" alt="Casa Estampa">`;
    return `${linked}${icon}${lettering}</a>`;
  });
  rendered = replaceClassElement(rendered, "ul", "navbar-nav", (opening) => {
    const items = settings.menu
      .filter((item) => item?.label && item?.href)
      .map((item) => `<li><a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a></li>`)
      .join("");
    return `${opening}${items}</ul>`;
  });
  for (const className of ["navbar-wa", "nav-cta", "btn-talk"]) {
    rendered = replaceClassElement(rendered, "a", className, (opening) => {
      const linked = setHtmlAttribute(opening, "href", settings.header.ctaHref);
      return `${linked}<i class="ti ti-brand-whatsapp" aria-hidden="true"></i> ${escapeHtml(settings.header.ctaLabel)}</a>`;
    });
  }
  rendered = replaceClassText(rendered, ["footer-name", "footer-logo-text"], settings.footer.brand);
  const footerValues = [settings.footer.subtitle, settings.footer.site, settings.footer.contact];
  let footerIndex = 0;
  for (const tag of ["span", "div"]) {
    rendered = rendered.replace(classElementPattern(tag, "footer-sub"), (match, opening) => {
      const value = footerValues[Math.min(footerIndex, footerValues.length - 1)];
      footerIndex += 1;
      return `${opening}${escapeHtml(value)}</${tag}>`;
    });
  }
  return rendered;
}

function replaceClassElement(html, tag, className, replacer) {
  return html.replace(classElementPattern(tag, className), (_match, opening, inner) => replacer(opening, inner));
}

function replaceClassText(html, classNames, value, tag = "div") {
  let rendered = html;
  for (const className of classNames) {
    rendered = rendered.replace(classElementPattern(tag, className), (_match, opening) => `${opening}${escapeHtml(value)}</${tag}>`);
  }
  return rendered;
}

function classElementPattern(tag, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(<${tag}\\b(?=[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${escaped}\\b[^"']*["'])[^>]*>)([\\s\\S]*?)<\\/${tag}>`, "gi");
}

function setHtmlAttribute(tag, name, value) {
  const safeValue = escapeAttribute(value);
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${safeValue}"`);
  return tag.replace(/>$/, ` ${name}="${safeValue}">`);
}

function buildGlobalCss(settings) {
  const rules = [];
  const root = [];
  rules.push(".navbar{height:95px!important;min-height:95px!important;padding:10px clamp(16px,3vw,48px)!important;gap:24px!important;box-sizing:border-box!important;}");
  rules.push(".navbar-logo{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important;margin:0!important;}");
  rules.push(".navbar-logo .site-logo-icon{width:42px!important;height:42px!important;object-fit:contain!important;flex:0 0 42px!important;}");
  rules.push(".navbar-logo .site-logo-lettering{width:auto!important;height:58px!important;max-width:240px!important;object-fit:contain!important;}");
  rules.push(".navbar-nav{display:flex!important;flex:1 1 auto!important;align-items:center!important;justify-content:center!important;gap:clamp(12px,1.6vw,26px)!important;min-width:0!important;margin:0!important;padding:0!important;}");
  rules.push(".navbar-nav li{margin:0!important;padding:0!important;list-style:none!important;white-space:nowrap!important;}");
  rules.push(".navbar-cta,.navbar-wa{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;white-space:nowrap!important;padding:9px 16px!important;}");
  rules.push("@media(max-width:1024px){.navbar-nav{display:none!important;}}");
  rules.push("@media(max-width:768px){.navbar{height:66px!important;min-height:66px!important;padding:8px 16px!important;gap:12px!important;}.navbar-logo .site-logo-icon{width:32px!important;height:32px!important;flex-basis:32px!important;}.navbar-logo .site-logo-lettering{height:42px!important;max-width:140px!important;}.navbar-cta,.navbar-wa{font-size:9px!important;padding:8px 12px!important;letter-spacing:1px!important;}}");
  rules.push(".hero{min-height:720px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important;padding-left:clamp(24px,6vw,96px)!important;padding-right:clamp(24px,6vw,96px)!important;box-sizing:border-box!important;}");
  rules.push(".hero .hero-content,.hero .hero-left,.hero>.elementor-widget-wrap{width:min(800px,100%)!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important;}");
  rules.push(".hero>.elementor-widget-wrap>.elementor-element{width:100%!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .elementor-inner-column{width:100%!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .elementor-widget{margin-left:auto!important;margin-right:auto!important;align-self:center!important;}");
  rules.push(".hero .elementor-widget-container,.hero .hero-title,.hero .hero-h,.hero .hero-label,.hero .hero-subtitle,.hero .hero-sub,.hero .hero-sub-italic,.hero .hero-products,.hero .hero-desc,.hero .hero-quote{text-align:center!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero h1,.hero .hero-title,.hero .hero-h{width:100%!important;max-width:800px!important;font-size:clamp(48px,5vw,76px)!important;line-height:1.08!important;}");
  rules.push(".hero .hero-subtitle,.hero .hero-sub,.hero .hero-sub-italic,.hero .hero-products,.hero .hero-desc,.hero .hero-quote{max-width:760px!important;}");
  rules.push(".hero .hero-actions,.hero .hero-btns,.hero .hero-ctas{width:100%!important;justify-content:center!important;align-items:center!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .hero-search{width:min(560px,100%)!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .hero-label{display:flex!important;align-items:center!important;justify-content:center!important;}");
  rules.push("@media(max-width:768px){.hero{min-height:calc(100svh - 66px)!important;padding-left:20px!important;padding-right:20px!important;}.hero .hero-actions,.hero .hero-btns,.hero .hero-ctas{flex-direction:column!important;}.hero .hero-actions>a,.hero .hero-btns>a,.hero .hero-ctas>a{width:100%!important;justify-content:center!important;text-align:center!important;}}");
  if (settings.primaryColor) root.push(`--fendi:${settings.primaryColor};`);
  if (settings.accentColor) root.push(`--mustard:${settings.accentColor};`);
  if (settings.fontFamily) {
    rules.push(`body{font-family:'${String(settings.fontFamily).replaceAll("'", "")}',sans-serif;}`);
  }
  if (root.length) rules.push(`:root{${root.join("")}}`);
  if (settings.css) rules.push(settings.css);
  return rules.join("\n");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
