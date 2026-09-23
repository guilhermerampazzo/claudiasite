// Utilitarios de HTML compartilhados entre servidor (lib/db.js) e editor (client).
// Sem dependencias externas de Node para poder ser importado no browser.

const TABLER_LOCAL = '<link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css">';

export function normalizeIconFont(html) {
  if (!html || typeof html !== "string") return html;
  let out = html.replace(/<link[^>]*tabler-icons[^>]*>/gi, "");
  if (!out.includes("/assets/fonts/tabler-icons.min.css")) {
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${TABLER_LOCAL}</head>`);
    else if (/<body\b/i.test(out)) out = out.replace(/<body\b/i, `${TABLER_LOCAL}<body`);
    else out = `${TABLER_LOCAL}\n${out}`;
  }
  return out;
}

function melhorImg(tags) {
  return tags.find((tag) => tag.includes("/uploads/")) || tags[0];
}

export function dedupeStackedImages(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(
    /(<div class="elementor-icon-wrapper"[^>]*>)((?:(?!<\/div>)[\s\S])*?)(<\/div>)/g,
    (match, open, inner) => {
      const imgs = inner.match(/<img\b[^>]*>/g);
      if (!imgs || imgs.length <= 1) return match;
      return open + melhorImg(imgs) + "</div>";
    }
  );
}

export function removeEmptyVideos(html) {
  if (!html || typeof html !== "string") return html;
  return html
    .replace(/<video\b[^>]*\ssrc=""[^>]*>\s*(?:<source\b[^>]*>\s*)*<\/video\s*>/gi, "")
    .replace(/<video\b[^>]*>\s*<source\b[^>]*\ssrc=""[^>]*>\s*(?:<source\b[^>]*>\s*)*<\/video\s*>/gi, "");
}

/* ── Páginas de álbum de Papéis de Parede ────────────────────────────────
   1) Âncoras ANINHADAS duplicadas:
        <a href="/produto/x"><a href="/produto/x"><article class="prod-card">…</article></a></a>
      HTML não permite <a> dentro de <a>: o parser fecha a externa na hora e
      sobra uma <a> VAZIA ocupando célula do grid → xadrez no desktop e todos
      os cards empurrados para a coluna da direita no mobile.
   2) Capa de álbum sem link na página de categorias: o <img alt="Álbum X">
      precisa ficar dentro do mesmo <a href> dos demais álbuns, senão clicar
      no card não abre o álbum ("não abre"). */
const NESTED_ANCHOR = /<a\b([^>]*)>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/a>/g;

function hrefOf(attrs) {
  const m = /href="([^"]*)"/.exec(attrs || "");
  return m ? m[1] : null;
}

export function collapseNestedAnchors(html) {
  if (!html || typeof html !== "string") return html;
  let out = html;
  let rounds = 0;
  let changed = false;
  do {
    changed = false;
    out = out.replace(NESTED_ANCHOR, (match, a1, a2, body) => {
      const h1 = hrefOf(a1);
      const h2 = hrefOf(a2);
      if (!h1 || !h2 || h1 !== h2) return match; // hrefs diferentes/ausentes: não mexe
      changed = true;
      return `<a${a2}>${body}</a>`;
    });
    rounds += 1;
  } while (changed && rounds < 6);
  return out;
}

export function slugifyLabel(label) {
  return String(label)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ALBUM_LINK_STYLE = ' style="display:block;width:100%;height:100%;"';

export function wrapAlbumCovers(html) {
  if (!html || typeof html !== "string") return { html, wrapped: 0, skipped: 0 };
  // Só aceita um href que JÁ EXISTE na página (ex.: /album-bjorn ou
  // /up-to-date) — nunca inventa URL.
  const existentes = new Set([...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]));
  let out = "";
  let idx = 0;
  let wrapped = 0;
  let skipped = 0;
  const re = /<img\b[^>]*\balt="Á?lbum\s+([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const antes = html.slice(Math.max(0, m.index - 400), m.index);
    if (/<a\b[^>]*>\s*$/.test(antes)) continue; // já está linkada
    const s = slugifyLabel(m[1]);
    const href = [`/${s}`, `/album-${s}`].find((c) => existentes.has(c));
    if (!href) { skipped += 1; continue; }
    out += html.slice(idx, m.index);
    out += `<a href="${href}"${ALBUM_LINK_STYLE}>${m[0]}</a>`;
    idx = m.index + m[0].length;
    wrapped += 1;
  }
  out += html.slice(idx);
  return { html: out, wrapped, skipped };
}

export function fixAlbumHtml(html) {
  const antes = html;
  const aninhadas = collapseNestedAnchors(html);
  const { html: final, wrapped, skipped } = wrapAlbumCovers(aninhadas);
  return { html: final, mudou: final !== antes, wrapped, skipped, aninhadas: aninhadas !== antes };
}
