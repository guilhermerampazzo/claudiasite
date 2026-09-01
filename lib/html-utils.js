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
