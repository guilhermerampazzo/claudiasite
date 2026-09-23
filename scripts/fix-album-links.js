#!/usr/bin/env node
/*
 * Corrige as páginas de álbum de Papéis de Parede no BANCO.
 * (as funções moram em lib/html-utils.js — mesma versão usada no render)
 *
 * 1) colapsa âncoras <a> aninhadas duplicadas (fonte do xadrez/coluna vazia);
 * 2) embrulha as capas de álbum que ficaram sem <a href> (Up to Date e
 *    Stories of Life não abriam de dentro da página de categorias);
 * 3) religa os <article class="prod-card"> em <a href="/produto/..."> usando o
 *    índice do catálogo (só se o produto existir).
 *
 * Uso (dentro do container web, que enxerga o db pelo DATABASE_URL):
 *   docker exec -w /app claudiasite_site_10215-web-1 node scripts/fix-album-links.js
 * dry-run (não grava):
 *   docker exec -w /app -e FIX_DRY=1 claudiasite_site_10215-web-1 node scripts/fix-album-links.js
 */

const { fixAlbumHtml, buildProductIndex } = await import(new URL("../lib/html-utils.js", import.meta.url).href);
const { dbQuery, ensureDatabase } = await import(new URL("../lib/db.js", import.meta.url).href);

const dry = process.env.FIX_DRY === "1" || process.argv.includes("--dry");
await ensureDatabase();

// índice do catálogo: só linka produto que exista (slug/nome/sufixo)
const prods = await dbQuery("SELECT name, slug FROM catalog_products");
const findProductHref = buildProductIndex(prods.rows);

const res = await dbQuery("SELECT slug, html FROM pages ORDER BY slug");
const relatorio = [];
let aninhadas = 0;
let capas = 0;
let puladas = 0;
let produtos = 0;
let produtosPulados = 0;

for (const row of res.rows) {
  const r = fixAlbumHtml(row.html, { findProductHref });
  if (!r.mudou) continue;
  const detalhes = [];
  if (r.aninhadas) { detalhes.push("aninhadas"); aninhadas += 1; }
  if (r.wrapped) { detalhes.push(`capas+${r.wrapped}`); capas += r.wrapped; }
  if (r.skipped) { detalhes.push(`capas-sem-candidato:${r.skipped}`); puladas += r.skipped; }
  if (r.produtos) { detalhes.push(`produtos+${r.produtos}`); produtos += r.produtos; }
  if (r.produtosIgnorados) { detalhes.push(`produtos-sem-catalogo:${r.produtosIgnorados}`); produtosPulados += r.produtosIgnorados; }
  relatorio.push(`${row.slug} [${detalhes.join(", ")}]`);
  if (!dry) {
    await dbQuery("UPDATE pages SET html = $1, updated_at = now() WHERE slug = $2", [r.html, row.slug]);
  }
}

console.log(JSON.stringify({
  dry,
  paginasLidas: res.rows.length,
  catalogo: prods.rows.length,
  alteradas: relatorio.length,
  aninhadasCorrigidas: aninhadas,
  capasEmbrulhadas: capas,
  capasIgnoradas: puladas,
  produtosLinkados: produtos,
  produtosSemCatalogo: produtosPulados,
  detalhe: relatorio,
}, null, 1));
process.exit(0);
