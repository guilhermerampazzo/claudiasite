import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery, ensureDatabase, setHomePage } from "../lib/db.js";

const dir = path.join(process.cwd(), "content", "revisao");

async function main() {
  await ensureDatabase();
  const index = JSON.parse(await fs.readFile(path.join(dir, "index.json"), "utf8"));

  for (const page of index) {
    const html = await fs.readFile(path.join(dir, `${page.slug}.html`), "utf8");
    await dbQuery(
      `INSERT INTO pages (slug, title, html, original_html, is_home, page_type)
       VALUES ($1, $2, $3, $3, false, 'page')
       ON CONFLICT (slug) DO UPDATE
         SET html = EXCLUDED.html,
             original_html = EXCLUDED.original_html,
             title = EXCLUDED.title,
             updated_at = now()`,
      [page.slug, page.title, html]
    );
    console.log("importada:", page.slug);
  }

  const home = await setHomePage("home");
  console.log("pagina inicial:", home?.slug || "falhou");
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao importar revisao:", error);
  process.exit(1);
});
