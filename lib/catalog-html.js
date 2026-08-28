import { catalogImage } from "./catalog.js";

export function buildCatalogDocument({ homeHtml, title, content }) {
  const head = homeHtml.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] || "<head><meta charset=\"utf-8\"></head>";
  const header = homeHtml.match(/<nav\b(?=[^>]*class=["'][^"']*\bnavbar\b)[^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
  const footer = homeHtml.match(/<footer\b(?=[^>]*class=["'][^"']*\bfooter\b)[^>]*>[\s\S]*?<\/footer>/i)?.[0] || "";
  return `<!doctype html><html lang="pt-BR">${head.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} - Casa Estampa</title>`)}<body>${header}<main class="ce-catalog">${content}</main>${footer}${catalogStyles()}</body></html>`;
}

export function injectCatalogSection(html, section) {
  if (!section) return html;
  // Guarda anti-duplicação: se a seção já está gravada no HTML da página
  // (ex.: salva manualmente em algum momento), não injetar outra cópia.
  if (/class="[^"]*ce-catalog-embedded/.test(html)) return html;
  // Desativação por página: se a página contém <!-- ce-catalog-none -->,
  // o catálogo NÃO é injetado (ex.: cortinas não exibe álbuns).
  if (html.includes("<!-- ce-catalog-none -->")) return html;
  // Marcador de posição: se a página define onde o catálogo deve ficar
  // (ex.: persianas — no lugar da antiga seção de fabricantes), substituir ali.
  if (html.includes("<!-- ce-catalog-embed -->")) {
    return html.replace("<!-- ce-catalog-embed -->", section);
  }
  if (/<footer\b/i.test(html)) return html.replace(/<footer\b/i, `${section}<footer`);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${section}</body>`);
  return `${html}${section}`;
}

export function renderCatalogIndex(categories) {
  const roots = categories.filter((category) => !category.parent_source_id);
  return `${catalogHero("Catálogo Casa Estampa", "Explore papéis de parede, cortinas, persianas, pisos e revestimentos organizados por coleção.")}
    <section class="ce-catalog-section"><div class="ce-catalog-heading"><span>COLEÇÕES</span><h2>Encontre por categoria</h2></div>${categoryGrid(roots)}</section>`;
}

export function renderCategoryPage({ category, children, listing }) {
  const cards = children.length ? categoryGrid(children) : productGrid(listing.products);
  return `<section class="ce-category-hero" style="--category-image:url('${catalogImage("categoria", category.source_id, Boolean(category.image_url))}')"><div class="ce-category-shade"></div><div><h1>${escapeHtml(category.name)}</h1>${category.description ? `<div class="ce-category-description">${escapeHtml(category.description)}</div>` : ""}</div></section>
    <section class="ce-catalog-section"><div class="ce-catalog-heading"><span>${children.length ? "SUBCATEGORIAS E ÁLBUNS" : `${listing.total} PRODUTOS`}</span><h2>${children.length ? "Explore as coleções" : `Produtos de ${escapeHtml(category.name)}`}</h2></div>${cards}${!children.length ? pagination(category.path, listing) : ""}</section>`;
}

export function renderProductPage(product, { prev = null, next = null } = {}) {
  const image = product.images?.[0];
  const categories = product.categories || [];
  const nav = `${prev ? `<a class="ce-product-nav prev" href="/produto/${escapeAttribute(prev.slug)}" aria-label="Modelo anterior" title="${escapeAttribute(prev.name)}"><i class="ti ti-chevron-left"></i></a>` : ""}${next ? `<a class="ce-product-nav next" href="/produto/${escapeAttribute(next.slug)}" aria-label="Próximo modelo" title="${escapeAttribute(next.name)}"><i class="ti ti-chevron-right"></i></a>` : ""}`;
  return `<section class="ce-product"><div class="ce-product-media">${nav}<div class="ce-product-ref"><span>REFERÊNCIA</span><strong>${escapeHtml(product.sku || product.name)}</strong></div><img src="${catalogImage("produto", product.source_id, Boolean(image))}" alt="${escapeAttribute(image?.alt || product.name)}"></div><div class="ce-product-info"><nav class="ce-breadcrumb"><a href="/catalogo">Catálogo</a>${categories.slice(0, 3).map((category) => `<span>/</span><a href="/categoria-produto/${escapeAttribute(category.path)}">${escapeHtml(category.name)}</a>`).join("")}</nav><p class="ce-product-kicker">CASA ESTAMPA INTERIORES</p><h1>${escapeHtml(product.name)}</h1><p class="ce-product-description">${escapeHtml(product.description || product.short_description || "Consulte nossa equipe para conhecer detalhes, disponibilidade e aplicação deste produto.")}</p><dl><div><dt>Referência</dt><dd>${escapeHtml(product.sku || "Sob consulta")}</dd></div><div><dt>Categorias</dt><dd>${categories.map((item) => escapeHtml(item.name)).join(", ")}</dd></div></dl><a class="ce-product-cta" href="https://wa.me/5519997840031?text=${encodeURIComponent(`Olá, gostaria de informações sobre ${product.name}`)}"><i class="ti ti-brand-whatsapp"></i> FALAR COM ESPECIALISTA</a></div></section>`;
}

export function renderCatalogSection(categories, { title = "Explore nossos catálogos", limit = 12 } = {}) {
  if (!categories?.length) return "";
  return `<section class="ce-catalog ce-catalog-embedded"><div class="ce-catalog-heading"><span>CATÁLOGO CASA ESTAMPA</span><h2>${escapeHtml(title)}</h2><p>Conheça coleções, álbuns e produtos disponíveis para o seu projeto.</p></div>${categoryGrid(categories.slice(0, limit))}<a class="ce-catalog-more" href="/catalogo">VER CATÁLOGO COMPLETO <i class="ti ti-arrow-right"></i></a></section>${catalogStyles()}`;
}

function catalogHero(title, description) {
  return `<section class="ce-catalog-intro"><p>CASA ESTAMPA INTERIORES</p><h1>${escapeHtml(title)}</h1><div></div><span>${escapeHtml(description)}</span></section>`;
}

function categoryGrid(categories) {
  if (!categories.length) return emptyState();
  return `<div class="ce-category-grid">${categories.map((category) => `<a class="ce-category-card" href="/categoria-produto/${escapeAttribute(category.path)}"><div class="ce-category-image"><img loading="lazy" src="${catalogImage("categoria", category.source_id, Boolean(category.image_url))}" alt="${escapeAttribute(category.name)}"></div><div><span>${category.child_count ? `${category.child_count} coleções` : `${category.product_count} produtos`}</span><h3>${escapeHtml(category.name)}</h3><i class="ti ti-arrow-up-right"></i></div></a>`).join("")}</div>`;
}

function productGrid(products) {
  if (!products.length) return emptyState();
  return `<div class="ce-product-grid">${products.map((product) => `<a class="ce-product-card" href="/produto/${escapeAttribute(product.slug)}"><img loading="lazy" src="${catalogImage("miniatura", product.source_id, Boolean(product.image_url))}" alt="${escapeAttribute(product.name)}"><div><span>${escapeHtml(product.sku || "Casa Estampa")}</span><h3>${escapeHtml(product.name)}</h3><i class="ti ti-arrow-up-right"></i></div></a>`).join("")}</div>`;
}

function pagination(categoryPath, listing) {
  const pages = Math.ceil(listing.total / listing.perPage);
  if (pages < 2) return "";
  return `<nav class="ce-pagination" aria-label="Paginação">${listing.page > 1 ? `<a href="/categoria-produto/${categoryPath}?pagina=${listing.page - 1}"><i class="ti ti-chevron-left"></i> Anterior</a>` : "<span></span>"}<strong>${listing.page} de ${pages}</strong>${listing.page < pages ? `<a href="/categoria-produto/${categoryPath}?pagina=${listing.page + 1}">Próxima <i class="ti ti-chevron-right"></i></a>` : "<span></span>"}</nav>`;
}

function emptyState() {
  return '<div class="ce-catalog-empty">Nenhum item encontrado nesta categoria.</div>';
}

function labelFromSlug(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function catalogStyles() {
  return `<style id="ce-catalog-styles">
  .ce-catalog{--ce-ink:#1d190f;--ce-brown:#34260d;--ce-gold:#c5a65e;--ce-light:#f4efe4;background:#f4efe4;color:#201b13;min-height:70vh}.ce-catalog *{box-sizing:border-box}.ce-catalog a{text-decoration:none}.ce-catalog-intro{min-height:410px;padding:120px 24px 70px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#201b12;color:#f6e9c7}.ce-catalog-intro p,.ce-category-hero>div>p,.ce-product-kicker{margin:0 0 18px;color:#c5a65e;font:600 11px/1.3 Arial,sans-serif;letter-spacing:4px}.ce-catalog-intro h1,.ce-category-hero h1{margin:0;font:400 clamp(44px,6vw,76px)/1.05 Georgia,serif;letter-spacing:0}.ce-catalog-intro div{width:48px;height:2px;margin:26px;background:#c5a65e}.ce-catalog-intro span{max-width:700px;font:400 17px/1.7 Arial,sans-serif;color:#d5c9af}.ce-catalog-section{padding:80px clamp(24px,5vw,88px);max-width:1600px;margin:auto}.ce-catalog-heading{margin-bottom:34px}.ce-catalog-heading>span{display:block;margin-bottom:12px;color:#a27b26;font:700 10px/1.3 Arial,sans-serif;letter-spacing:4px}.ce-catalog-heading h2{margin:0;color:#2c2316;font:400 clamp(34px,4vw,52px)/1.1 Georgia,serif;letter-spacing:0}.ce-catalog-heading p{max-width:660px;color:#766951;font:400 15px/1.7 Arial,sans-serif}.ce-category-grid,.ce-product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.ce-category-card,.ce-product-card{display:block;position:relative;overflow:hidden;background:#fff;color:#211b12;border:1px solid rgba(75,59,31,.15);border-radius:4px}.ce-category-image{aspect-ratio:4/3;overflow:hidden;background:#d8cfbd}.ce-category-image img,.ce-product-card>img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .45s ease}.ce-category-card:hover img,.ce-product-card:hover>img{transform:scale(1.035)}.ce-category-card>div:last-child,.ce-product-card>div{position:relative;min-height:105px;padding:20px 48px 20px 20px}.ce-category-card span,.ce-product-card span{display:block;color:#9b7b38;font:700 9px/1.3 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase}.ce-category-card h3,.ce-product-card h3{margin:7px 0 0;font:600 22px/1.2 Georgia,serif;letter-spacing:0}.ce-category-card i,.ce-product-card i{position:absolute;right:20px;top:50%;font-size:20px;transform:translateY(-50%);color:#a17c33}.ce-product-card>img{aspect-ratio:1/1;height:auto;background:#d8cfbd}.ce-category-hero{position:relative;min-height:290px;display:grid;place-items:center;padding:112px 24px 62px;text-align:center;color:#fff;background:#30281c var(--category-image) center/cover no-repeat}.ce-category-shade{position:absolute!important;inset:0;background:rgba(20,16,10,.57)}.ce-category-hero>div:last-child{position:relative;z-index:1;max-width:850px}.ce-category-description{margin:24px auto 0;max-width:650px;font:400 16px/1.7 Arial,sans-serif}.ce-breadcrumb{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 0 32px;font:500 11px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:1px}.ce-breadcrumb a{color:inherit}.ce-product{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);max-width:1250px;margin:0 auto;padding:140px 24px 80px;gap:0}.ce-product-media{position:relative;padding:40px;background:#211d1a;color:#fff}.ce-product-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:5;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#c5a65e;color:#181510;box-shadow:0 2px 12px rgba(0,0,0,.45);transition:background .2s}.ce-product-nav i{font-size:26px;line-height:1}.ce-product-nav:hover{background:#e8dcc0;color:#181510}.ce-product-nav.prev{left:12px}.ce-product-nav.next{right:12px}.ce-product-media img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;margin-top:20px}.ce-product-ref{display:flex;flex-direction:column;color:#c5a65e;font:500 13px/1.2 Arial,sans-serif;letter-spacing:2px}.ce-product-ref strong{margin-top:5px;color:#fff;font-size:24px;letter-spacing:0}.ce-product-info{display:flex;flex-direction:column;justify-content:center;padding:clamp(34px,6vw,80px);background:#fff}.ce-product-info .ce-breadcrumb{justify-content:flex-start;color:#8d7551}.ce-product-info h1{margin:0;color:#a98c44;font:600 clamp(34px,4vw,58px)/1.05 Arial,sans-serif;letter-spacing:0}.ce-product-description{margin:48px 0;color:#6c6256;font:400 16px/1.8 Arial,sans-serif}.ce-product-info dl{border-top:1px solid #e1ddd5;padding-top:18px}.ce-product-info dl div{display:flex;gap:18px;margin:9px 0;font:400 12px/1.5 Arial,sans-serif}.ce-product-info dt{color:#a98c44;text-transform:uppercase}.ce-product-info dd{margin:0;color:#655b50}.ce-product-cta,.ce-catalog-more{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:max-content;margin-top:30px;padding:16px 22px;background:#24ca67;color:#fff;font:700 11px/1 Arial,sans-serif;letter-spacing:1.5px}.ce-pagination{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-top:45px}.ce-pagination a{color:#7d632c;font:700 12px Arial,sans-serif}.ce-pagination a:last-child{text-align:right}.ce-pagination strong{font:500 12px Arial,sans-serif;color:#7c715f}.ce-catalog-empty{padding:60px;text-align:center;border:1px solid #d6cdbd;color:#786d5a}.ce-catalog-embedded{background:#f4efe4}.ce-catalog-more{background:#2a241a}.ce-catalog-embedded+.footer{margin-top:0}
  @media(max-width:1100px){.ce-category-grid,.ce-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:760px){.ce-catalog-section,.ce-catalog-embedded{padding:54px 18px}.ce-category-grid,.ce-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ce-category-card>div:last-child,.ce-product-card>div{min-height:88px;padding:14px 34px 14px 13px}.ce-category-card h3,.ce-product-card h3{font-size:17px}.ce-category-card i,.ce-product-card i{right:12px}.ce-product{grid-template-columns:1fr;padding:90px 14px 50px}.ce-product-media{padding:20px}.ce-product-info{padding:32px 22px}.ce-product-description{margin:28px 0}.ce-category-hero{min-height:210px;padding:96px 18px 48px}.ce-category-hero h1{font-size:34px}.ce-catalog-intro{min-height:350px;padding-top:100px}}
  /* ── Variante embutida (seção "Conheça nossas linhas" dentro das páginas escuras) ── */
  .ce-catalog-embedded{background:#181510;color:#e8dcc0;padding:80px 80px 40px;max-width:none;margin:0}
  .ce-catalog-embedded .ce-catalog-heading>span{color:#c5a65e}
  .ce-catalog-embedded .ce-catalog-heading h2{color:#f2e8cf}
  .ce-catalog-embedded .ce-catalog-heading p{color:#b7a98c}
  .ce-catalog-embedded .ce-category-card{background:#221d15;color:#e8dcc0;border-color:rgba(194,165,122,.22)}
  .ce-catalog-embedded .ce-category-card h3{color:#f2e8cf}
  .ce-catalog-embedded .ce-category-card span{color:#c5a65e}
  .ce-catalog-embedded .ce-category-card i{color:#c5a65e}
  .ce-catalog-embedded .ce-catalog-more{color:#c5a65e;border-color:rgba(194,165,122,.4)}
  .ce-catalog-embedded .ce-catalog-more:hover{background:rgba(194,165,122,.12)}
  .ce-catalog-embedded .ce-catalog-empty{color:#b7a98c;border-color:rgba(194,165,122,.2)}
  </style>`;
}
