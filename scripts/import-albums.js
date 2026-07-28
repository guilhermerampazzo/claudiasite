import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery, ensureDatabase } from "../lib/db.js";
import { normalizeSourceHtml } from "../lib/source-pages.js";

const albumsDir = path.join(process.cwd(), "content", "albuns");
const originalDir = path.join(process.cwd(), "content", "original");

async function upsertPage({ slug, title, html }) {
  const result = await dbQuery(
    `INSERT INTO pages (slug, title, html, original_html, is_home, page_type)
     VALUES ($1, $2, $3, $3, false, 'page')
     ON CONFLICT (slug) DO UPDATE
       SET html = EXCLUDED.html,
           original_html = EXCLUDED.original_html,
           title = EXCLUDED.title,
           updated_at = now()
     RETURNING slug`,
    [slug, title, html]
  );
  return result.rows[0]?.slug;
}

async function main() {
  await ensureDatabase();

  const index = JSON.parse(await fs.readFile(path.join(albumsDir, "index.json"), "utf8"));
  let imported = 0;

  for (const album of index) {
    const file = path.join(albumsDir, `${album.slug}.html`);
    const html = normalizeSourceHtml(await fs.readFile(file, "utf8"));
    await upsertPage({
      slug: album.slug,
      title: `Álbum ${album.name}`,
      html
    });
    imported += 1;
  }
  console.log("albuns importados:", imported);

  const papeisHtml = normalizeSourceHtml(
    await fs.readFile(path.join(originalDir, "papeis-de-parede.html"), "utf8")
  );
  await upsertPage({
    slug: "papeis-de-parede",
    title: "Papeis de Parede",
    html: papeisHtml
  });
  console.log("papeis-de-parede atualizada");

  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao importar albuns:", error);
  process.exit(1);
});
