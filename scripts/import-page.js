import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery, ensureDatabase } from "../lib/db.js";
import { normalizeSourceHtml } from "../lib/source-pages.js";

function parseArgs(argv) {
  const [file, ...rest] = argv;
  if (!file) {
    throw new Error("Uso: node scripts/import-page.js <arquivo.html> --slug=meu-slug --title=\"Meu Titulo\" [--home]");
  }
  const options = { file, home: false };
  for (const arg of rest) {
    if (arg === "--home") { options.home = true; continue; }
    const [, key, value] = arg.match(/^--([a-z]+)=(.*)$/i) || [];
    if (key) options[key] = value;
  }
  if (!options.slug) throw new Error("Informe --slug=algum-slug");
  if (!options.title) throw new Error("Informe --title=\"Titulo da pagina\"");
  return options;
}

async function main() {
  const { file, slug, title, home } = parseArgs(process.argv.slice(2));
  const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const rawHtml = await fs.readFile(absolutePath, "utf8");
  const html = normalizeSourceHtml(rawHtml);

  await ensureDatabase();

  if (home) {
    await dbQuery("UPDATE pages SET is_home = false WHERE page_type = 'page'");
  }

  const result = await dbQuery(
    `INSERT INTO pages (slug, title, html, original_html, is_home, page_type)
     VALUES ($1, $2, $3, $3, $4, 'page')
     ON CONFLICT (slug) DO UPDATE
       SET html = EXCLUDED.html,
           original_html = EXCLUDED.original_html,
           title = EXCLUDED.title,
           is_home = EXCLUDED.is_home,
           updated_at = now()
     RETURNING slug, title, is_home, updated_at`,
    [slug, title, html, home]
  );

  console.log("Pagina importada:", result.rows[0]);
  console.log(`Editar em: /admin/editor/${slug}`);
  console.log(`Ver publicada em: /${slug}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Falha ao importar pagina:", error.message);
  process.exit(1);
});
