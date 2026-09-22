// Links internos no v2: as páginas vivem em /v2/<slug> (e a home em /v2-home).
// Mantém o HTML congelado intacto (a fonte continua com os links originais) e
// reescreve só na hora de servir/editar.

export const V2_SLUGS = [
  "home",
  "papeis-de-parede",
  "cortinas",
  "persianas",
  "pisos",
  "arquitetos-designers",
  "corporativo",
  "amorim",
  "amorim-tela-solar",
];

export function toV2Path(href) {
  if (!href || typeof href !== "string") return href;
  if (href === "/") return "/v2-home";
  if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  const match = href.match(/^\/([a-z0-9-]+)(\/.*)?$/i);
  if (match && V2_SLUGS.includes(match[1])) {
    return match[1] === "home" ? "/v2-home" : `/v2/${match[1]}${match[2] || ""}`;
  }
  return href;
}

export function rewriteHtmlLinks(html) {
  return html.replace(/href="(\/[^"]*)"/g, (_full, href) => `href="${toV2Path(href)}"`);
}
