#!/usr/bin/env node
/*
 * Corrige as páginas de álbum de Papéis de Parede no BANCO.
 * (as funções moram em lib/html-utils.js — mesma versão usada no render)
 *
 * 1) colapsa âncoras <a> aninhadas duplicadas (fonte do xadrez/coluna vazia);
 * 2) embrulha as capas de álbum que ficaram sem <a href> (Up to Date e
 *    Stories of Life não abriam de dentro da página de categorias).
 *
 * Uso (dentro do container web, que enxerga o db pelo DATABASE_URL):
 *   docker exec -i claudiasite_site_10215-web-1 node - < scripts/fix-album-links.js
 * dry-run (não grava):
 *   docker exec -i -e FIX_DRY=1 claudiasite_site_10215-web-1 node - < scripts/fix-album-links.js
 */

const { fixAlbumHtml } = await import(new URL("../lib/html-utils.js", import.meta.url).href);
const { dbQuery, ensureDatabase } = await import(new URL("../lib/db.js", import.meta.url).href);

const dry = process.env.FIX_DRY === "1";
await ensureDatabase();

const res = await dbQuery("SELECT slug, html FROM pages ORDER BY slug");
const relatorio = [];
let aninhadas = 0;
let capas = 0;
let puladas = 0;

for (const row of res.rows) {
  const r = fixAlbumHtml(row.html);
  if (!r.mudou) continue;
  const detalhes = [];
  if (r.aninhadas) { detalhes.push("aninhadas"); aninhadas += 1; }
  if (r.wrapped) { detalhes.push(`capas+${r.wrapped}`); capas += r.wrapped; }
  if (r.skipped) { detalhes.push(`capas-sem-candidato:${r.skipped}`); puladas += r.skipped; }
  relatorio.push(`${row.slug} [${detalhes.join(", ")}]`);
  if (!dry) {
    await dbQuery("UPDATE pages SET html = $1, updated_at = now() WHERE slug = $2", [r.html, row.slug]);
  }
}

console.log(JSON.stringify({ dry, paginasLidas: res.rows.length, alteradas: relatorio.length, aninhadasCorrigidas: aninhadas, capasEmbrulhadas: capas, capasIgnoradas: puladas, detalhe: relatorio }, null, 1));
process.exit(0);
