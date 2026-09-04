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
import { dedupeStackedImages, normalizeIconFont, removeEmptyVideos } from "./html-utils.js";

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

export function renderHtml(html, settings = {}, { globalHeaderHtml = null, seo = null } = {}) {
  const mergedSettings = mergeSiteSettings(settings);
  let rendered = globalHeaderHtml ? replaceGlobalHeader(html, globalHeaderHtml) : html;
  rendered = sanitizeLegacyCarouselScripts(rendered);
  rendered = dedupeStackedImages(rendered);
  rendered = removeEmptyVideos(rendered);
  rendered = applySiteChrome(rendered, mergedSettings);
  rendered = ensureSeoMeta(rendered, seo);

  rendered = normalizeIconFont(rendered);

  const globalCss = buildGlobalCss(mergedSettings);
  const usedFonts = GOOGLE_FONTS.filter((font) => rendered.includes(font) || mergedSettings.fontFamily === font);
  const tags = [];
  if (usedFonts.length) tags.push(`<link id="casa-estampa-google-fonts" rel="stylesheet" href="${googleFontsStylesheet(usedFonts)}">`);
  if (globalCss.trim()) tags.push(`<style id="casa-estampa-global-overrides">${globalCss}</style>`);
  if (/mot-video/.test(rendered)) {
    tags.push(`<script id="casa-estampa-mot-videos">${buildMotVideoScript()}</script>`);
  }
  if (/media-video-box|video-wrap/.test(rendered)) {
    tags.push(`<script id="casa-estampa-mostruario-video">${buildMostruarioVideoScript()}</script>`);
  }
  if (/\bnavbar\b/i.test(rendered)) {
    tags.push(`<script id="casa-estampa-global-nav">${buildGlobalNavScript()}</script>`);
  }
  if (hasCarouselMarkup(rendered)) {
    tags.push(`<script id="casa-estampa-global-carousel">${buildGlobalCarouselScript()}</script>`);
  }
  if (/\bnavbar-search\b/i.test(rendered)) {
    tags.push(`<style id="casa-estampa-search-styles">${buildGlobalSearchStyles()}</style>`);
    tags.push(`<script id="casa-estampa-global-search">${buildGlobalSearchScript()}</script>`);
  }
  if (hasLightboxMarkup(rendered)) {
    tags.push(`<style id="casa-estampa-lightbox-styles">${buildGlobalLightboxStyles()}</style>`);
    tags.push(`<script id="casa-estampa-global-lightbox">${buildGlobalLightboxScript()}</script>`);
  }
  if (rendered.includes("ce-exact-icon") && /<img\b/i.test(rendered)) {
    tags.push(`<script id="casa-estampa-image-placeholders">${buildImagePlaceholderScript()}</script>`);
  }
  if (/cat-filters|cat-pill/.test(rendered)) {
    tags.push(`<script id="casa-estampa-papeis-filter">${buildPapeisFilterScript()}</script>`);
  }
  if (/ceCalcularRolos|calcularRolos/.test(rendered)) {
    tags.push(`<script id="casa-estampa-calc-fix">${buildCalcFixScript()}</script>`);
  }
  if (/album-grid|album-card/.test(rendered)) {
    tags.push(`<script id="casa-estampa-album-click">${buildAlbumClickScript()}</script>`);
  }
  if (/elementor-toggle|elementor-tab-title|faq-item/.test(rendered)) {
    tags.push(`<script id="casa-estampa-faq-toggle">${buildFaqToggleScript()}</script>`);
  }
  if (!tags.length) return rendered;
  if (rendered.includes("</body>")) return rendered.replace("</body>", `${tags.join("\n")}\n</body>`);
  if (rendered.includes("</head>")) return rendered.replace("</head>", `${tags.join("\n")}\n</head>`);
  return `${tags.join("\n")}\n${rendered}`;
}

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://casaestampa.com").replace(/\/$/, "");
const DEFAULT_SEO_DESCRIPTION = "Papeis de parede, cortinas, persianas e pisos sob medida no Rio de Janeiro. Medicao tecnica, fabricacao e instalacao especializada com a Casa Estampa Interiores.";
const DEFAULT_SEO_IMAGE = "/assets/logo-icone.svg";

function ensureSeoMeta(html, seo) {
  if (!/<head[\s>]/i.test(html)) return html;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = (seo && seo.title ? seo.title : (titleMatch ? titleMatch[1] : "Casa Estampa Interiores")).trim();
  const description = String((seo && seo.description) || DEFAULT_SEO_DESCRIPTION).trim().slice(0, 300);
  const rawPath = seo && seo.path ? seo.path : "";
  const path = rawPath ? (rawPath.startsWith("/") ? rawPath : "/" + rawPath) : "";
  const canonicalUrl = PUBLIC_SITE_URL + path;
  const rawImage = seo && seo.image ? seo.image : "";
  const image = rawImage ? (rawImage.startsWith("http") ? rawImage : PUBLIC_SITE_URL + rawImage) : PUBLIC_SITE_URL + DEFAULT_SEO_IMAGE;
  const tags = [];
  if (!/<meta\s+name=["']description["']/i.test(html)) {
    tags.push('<meta name="description" content="' + escapeAttribute(description) + '">');
  }
  if (!/<link\s+rel=["']canonical["']/i.test(html)) {
    tags.push('<link rel="canonical" href="' + escapeAttribute(canonicalUrl) + '">');
  }
  if (!/property=["']og:title["']/i.test(html)) {
    tags.push('<meta property="og:type" content="website">');
    tags.push('<meta property="og:site_name" content="Casa Estampa Interiores">');
    tags.push('<meta property="og:title" content="' + escapeAttribute(title) + '">');
    tags.push('<meta property="og:description" content="' + escapeAttribute(description) + '">');
    tags.push('<meta property="og:url" content="' + escapeAttribute(canonicalUrl) + '">');
    tags.push('<meta property="og:image" content="' + escapeAttribute(image) + '">');
  }
  if (!/name=["']twitter:card["']/i.test(html)) {
    tags.push('<meta name="twitter:card" content="summary_large_image">');
    tags.push('<meta name="twitter:title" content="' + escapeAttribute(title) + '">');
    tags.push('<meta name="twitter:description" content="' + escapeAttribute(description) + '">');
    tags.push('<meta name="twitter:image" content="' + escapeAttribute(image) + '">');
  }
  if (!tags.length) return html;
  var joined = tags.join(String.fromCharCode(10));
  return html.replace(/<head([^>]*)>/i, "<head$1>" + String.fromCharCode(10) + joined);
}

function sanitizeLegacyCarouselScripts(html) {
  let sanitized = html;
  // Remove IIFE infinita que triplica slides (cortinas instTrack, persianas galTrack2, genéricos)
  // Esses scripts clonam 3x e quebram quando o usuário adiciona fotos via editor;
  // o carrossel global (ce-global-carousel) já cuida de scroll/dots/autoplay sem duplicar DOM.
  sanitized = sanitized.replace(
    /\(function\s*\(\)\s*\{\s*var\s+track\s*=\s*document\.getElementById\(['"](?:instTrack|instTrackFlex|galTrack2|galTrack)['"]\)[\s\S]*?}\)\(\);/g,
    "/* ce-legacy-carousel removido: substituido por ce-global-carousel */"
  );
  // Fallback genérico: qualquer IIFE que faça clone infinito de slides (appendChild cloneNode + insertBefore cloneNode + scrollLeft clone logic)
  sanitized = sanitized.replace(
    /slides\.forEach\s*\(\s*function\s*\(s\)\s*\{\s*track\.appendChild\(s\.cloneNode\(true\)\);\s*\}\s*\);/g,
    "/* ce-clone-append removido */"
  );
  sanitized = sanitized.replace(
    /slides\.forEach\s*\(\s*function\s*\(s\)\s*\{\s*track\.insertBefore\(s\.cloneNode\(true\),\s*track\.firstChild\);\s*\}\s*\);/g,
    "/* ce-clone-prepend removido */"
  );
  // Remove reset infinito de scroll que depende do DOM triplicado
  sanitized = sanitized.replace(
    /track\.addEventListener\(['"]scroll['"]\s*,\s*function\s*\(\)\s*\{\s*var\s+total\s*=\s*slides\.length\s*\*\s*slideW;[\s\S]*?\}\s*\);/g,
    "/* ce-scroll-reset removido */"
  );
  sanitized = sanitized.replace(
    /function\s+resetInfinite\s*\(\)\s*\{\s*var\s+total\s*=\s*slides\.length\s*\*\s*slideW;[\s\S]*?\}\s*track\.addEventListener\(['"]scroll['"]\s*,\s*resetInfinite\s*\);/g,
    "/* ce-resetInfinite removido */"
  );
  // Remove autoplay que conflita com ce-global-carousel (deixa só o global cuidar)
  sanitized = sanitized.replace(
    /var\s+auto\s*=\s*setInterval\s*\(\s*function\s*\(\)\s*\{\s*track\.scrollBy\([^}]*\}\s*,\s*30\s*\);\s*wrap\.addEventListener\(['"]mouseenter['"][\s\S]*?wrap\.addEventListener\(['"]mouseleave['"][\s\S]*?\}\s*\);/g,
    "/* ce-autoplay legado removido */"
  );
  // ── Fix álbuns/fabricantes: converte links casaestampa.com/categoria-produto -> rota interna
  // e corrige botões "Ver modelos" que apontam pro WhatsApp mas deveriam ir ao álbum/categoria.
  sanitized = rewriteCasaEstampaCategoryLinks(sanitized);
  sanitized = rewritePersianasFabricanteLinks(sanitized);
  sanitized = sanitizeHomeCatCards(sanitized);
  return sanitized;
}

function rewriteCasaEstampaCategoryLinks(html) {
  // casaestampa.com/categoria-produto/papeis-de-parede/... -> /categoria-produto/papeis-de-parede/...
  // casaestampa.com/produtos, etc já são tratados; foca em categorias e produtos
  return html.replaceAll(
    /https:\/\/casaestampa\.com(\/categoria-produto\/[^"'#\s?]*)/gi,
    "$1"
  );
}

function rewritePersianasFabricanteLinks(html) {
  const map = [
    { names: ["amorim"], path: "/categoria-produto/persianas/amorim-persianas-e-cortinas/" },
    { names: ["rio flex", "rioflex", "rio%20flex"], path: "/categoria-produto/persianas/rio-flex-cortinas-e-persianas/" },
    { names: ["gabriel"], path: "/categoria-produto/persianas/gabriel-persianas/" },
    { names: ["coimbra"], path: "/categoria-produto/persianas/coimbra-persianas/" },
    { names: ["nitflex"], path: "/categoria-produto/persianas/coimbra-persianas/" },
  ];
  let out = html;
  // Estratégia robusta: substitui qualquer href whatsapp que contenha nome do fabricante,
  // independente de estar em fab-btn ou não, e também trata WhatsApp com texto codificado (%20 etc)
  for (const entry of map) {
    for (const name of entry.names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\s+/g, "\\s+");
      // href="https://api.whatsapp.com...*amorim*"
      const pattern = new RegExp(`href=["']https:\\/\\/api\\.whatsapp\\.com[^"']*${escaped}[^"']*["']`, "gi");
      out = out.replace(pattern, `href="${entry.path}"`);
    }
  }
  // Fallback estrutural: dentro de cada fab-card, se ainda houver whatsapp, usa fab-nome do card
  out = out.replace(/<div class="fab-card">([\s\S]*?)<\/div>\s*<\/div>/gi, (block) => {
    const lower = block.toLowerCase();
    for (const entry of map) {
      if (entry.names.some((n) => lower.includes(n))) {
        if (/href=["']https:\/\/api\.whatsapp\.com/i.test(block)) {
          return block.replace(/href=["']https:\/\/api\.whatsapp\.com[^"']*["']/i, `href="${entry.path}"`);
        }
      }
    }
    return block;
  });
  return out;
}

function sanitizeHomeCatCards(html) {
  let out = html;
  // Corrige último cat-card da home sem </a> antes de fechar o grid (bug que faz <a> engolir seções seguintes)
  out = out.replace(/(<a[^>]*class="[^"]*cat-card[^"]*"[^>]*>[\s\S]*?<span class="cat-link"[\s\S]*?<\/span>\s*<\/span>\s*)(<\/div>\s*<\/section>\s*<!-- ATENDIMENTO -->)/gi, (m, inner, closing) => {
    if (/<\/a>\s*$/.test(inner)) return m;
    return inner + '</a>' + closing;
  });
  // Remove cat-cards vazios/órfãos que ficaram como filhos diretos de section.categorias fora do grid
  out = out.replace(/<div class="cat-grid">[\s\S]*?<\/div>\s*(<a[^>]*class="[^"]*cat-card[^"]*"[^>]*>\s*<\/a>\s*)(<\/section>)/gi, (m, stray, closing) => {
    // mantém só o fechamento correto
    return m.replace(stray, '') ;
  });
  // Remove cat-cards que envolvem seções inteiras (o grande que engloba atende-sep...), detectado por conter "<section class=\"atende-sep\""
  out = out.replace(/<a[^>]*class="[^"]*cat-card[^"]*"[^>]*>\s*<!-- ATENDIMENTO -->/gi, '<!-- ATENDIMENTO -->');
  out = out.replace(/<a[^>]*class="[^"]*cat-card[^"]*"[^>]*>\s*<div class="cta-bg-word">/gi, '<div class="cta-bg-word">');
  // Limpa fechamentos órfãos </a> que sobraram após unwrap
  // (não faz nada se já correto, mas evita duplicatas)
  out = out.replace(/(<section class="atende-sep"[\s\S]*?<\/section>)\s*<\/a>/gi, '$1');
  out = out.replace(/(<section class="porque"[\s\S]*?<\/section>)\s*<\/a>/gi, '$1');
  return out;
}

function replaceGlobalHeader(html, homeHeaderHtml) {
  const headerPart = GLOBAL_PARTS.find((part) => part.type === "global_header");
  const homeHeader = extractGlobalPart(homeHeaderHtml, headerPart);
  if (!homeHeader) return html;
  return replaceGlobalPart(html, headerPart, homeHeaderHtml);
}

function applySiteChrome(html, settings) {
  let rendered = html;
  rendered = ensureNavbarSocialBar(rendered, settings);
  rendered = replaceClassElement(rendered, "div", "navbar-social", () => buildNavbarSocialBar(settings));
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
  rendered = ensureMobileMenuToggle(rendered);
  rendered = ensureNavbarSearch(rendered);
  for (const className of ["navbar-wa", "nav-cta", "btn-talk"]) {
    rendered = replaceClassElement(rendered, "a", className, (opening) => {
      const linked = setHtmlAttribute(opening, "href", settings.header.ctaHref);
      return `${linked}<i class="ti ti-brand-whatsapp" aria-hidden="true"></i> ${escapeHtml(settings.header.ctaLabel)}</a>`;
    });
  }
  rendered = replaceClassElement(rendered, "footer", "footer", () => buildGlobalFooter(settings));
  if (!/class=["'][^"']*\bce-site-footer\b/i.test(rendered)) {
    const footer = buildGlobalFooter(settings);
    rendered = /<\/body>/i.test(rendered) ? rendered.replace(/<\/body>/i, `${footer}</body>`) : `${rendered}${footer}`;
  }
  // Garante o rodapé como filho direto do body (largura total em qualquer página)
  const footerMatch = rendered.match(/<footer class="footer ce-site-footer">[\s\S]*?<\/footer>/i);
  if (footerMatch && !/<body[^>]*>\s*<footer class="footer ce-site-footer/i.test(rendered)) {
    rendered = rendered.replace(footerMatch[0], "");
    rendered = /<\/body>/i.test(rendered) ? rendered.replace(/<\/body>/i, `${footerMatch[0]}</body>`) : `${rendered}${footerMatch[0]}`;
  }
  return rendered;

}

function ensureMobileMenuToggle(html) {
  if (/\bnavbar-toggle\b/i.test(html)) return html;
  return html.replace(
    /(<ul\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bnavbar-nav\b[^"']*["'])[^>]*>[\s\S]*?<\/ul>)(\s*<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bnavbar-(?:cta|wa)\b[^"']*["']))/i,
    `$1<button class="navbar-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="navbar-mobile-menu"><span></span><span></span><span></span></button>$2`
  );
}

function ensureNavbarSearch(html) {
  if (/\bnavbar-search\b/i.test(html) || !/\bnavbar\b/i.test(html)) return html;
  const searchBlock = `<div class="navbar-search"><button class="navbar-search-toggle" type="button" aria-label="Buscar no site" aria-expanded="false"><i class="ti ti-search" aria-hidden="true"></i></button><form class="navbar-search-form" role="search"><input type="search" class="navbar-search-input" placeholder="Buscar produtos, albuns..." aria-label="Buscar produtos"><div class="navbar-search-results" hidden></div></form></div>`;
  if (/\bnavbar-nav\b/i.test(html)) {
    return html.replace(
      /(<ul\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bnavbar-nav\b[^"']*["'])[^>]*>[\s\S]*?<\/ul>)/i,
      `$1${searchBlock}`
    );
  }
  return html.replace(
    /(<nav\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bnavbar\b[^"']*["'])[^>]*>)/i,
    `$1${searchBlock}`
  );
}

function ensureNavbarSocialBar(html, settings) {
  if (/\bnavbar-social\b/i.test(html)) return html;
  if (!/\bnavbar\b/i.test(html)) return html;
  return html.replace(
    /(<nav\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bnavbar\b[^"']*["'])[^>]*>)/i,
    `$1${buildNavbarSocialBar(settings)}`
  );
}

function buildNavbarSocialBar(settings) {
  const links = [
    { href: settings.social.instagram, icon: "ti-brand-instagram", label: "Instagram" },
    { href: settings.social.facebook, icon: "ti-brand-facebook", label: "Facebook" },
    { href: settings.social.pinterest, icon: "ti-brand-pinterest", label: "Pinterest" }
  ].filter((item) => item.href);
  if (!links.length) return `<div class="navbar-social"></div>`;
  const items = links
    .map((item) => `<a href="${escapeAttribute(item.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttribute(item.label)}"><i class="ti ${item.icon}" aria-hidden="true"></i></a>`)
    .join("");
  return `<div class="navbar-social">${items}</div>`;
}

function buildGlobalFooter(settings) {
  const menuItems = settings.menu
    .filter((item) => item?.label && item?.href)
    .slice(0, 7)
    .map((item) => `<a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("");
  const year = new Date().getFullYear();
  return `<footer class="footer ce-site-footer">
    <div class="ce-footer-main">
      <div class="ce-footer-brand">
        <a href="${escapeAttribute(settings.header.logoHref)}" aria-label="Página inicial Casa Estampa">
          <img class="ce-footer-icon" src="/assets/logo-icone.svg" alt="">
          <img class="ce-footer-lettering" src="/assets/logo-letra.svg" alt="Casa Estampa Interiores">
        </a>
      </div>
      <nav class="ce-footer-nav" aria-label="Navegação do rodapé">
        <strong>Explore</strong>
        <div>${menuItems}</div>
      </nav>
      <div class="ce-footer-contact">
        <strong>Atendimento</strong>
        <a href="${escapeAttribute(settings.header.ctaHref)}"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i>${escapeHtml(settings.footer.contact)}</a>
        <span>${escapeHtml(settings.footer.site)}</span>
        <small>Rio de Janeiro</small>
      </div>
    </div>
    <div class="ce-footer-bottom">
      <span>© ${year} ${escapeHtml(settings.footer.brand)}. Todos os direitos reservados.</span>
      <a href="${escapeAttribute(settings.header.ctaHref)}">Falar com a Casa Estampa <i class="ti ti-arrow-up-right" aria-hidden="true"></i></a>
    </div>
  </footer>`;
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

export function buildGlobalCss(settings) {
  const rules = [];
  const root = [];
  rules.push(".navbar{position:fixed!important;top:0;left:0;right:0;z-index:2400!important;height:104px!important;min-height:104px!important;padding:14px clamp(18px,3.4vw,56px)!important;gap:28px!important;box-sizing:border-box!important;}");
  rules.push(".navbar-logo{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important;margin:0!important;}");
  rules.push(".navbar-logo .site-logo-icon,.navbar-logo .logo-symbol{width:48px!important;height:48px!important;object-fit:contain!important;flex:0 0 48px!important;}");
  rules.push(".navbar-logo .site-logo-lettering{width:auto!important;height:66px!important;max-width:280px!important;object-fit:contain!important;}");
  rules.push(".navbar-logo .logo-text-wrap{display:none!important;}");
  rules.push(".navbar-nav{display:flex!important;flex:1 1 auto!important;align-items:center!important;justify-content:center!important;gap:clamp(12px,1.6vw,26px)!important;min-width:0!important;margin:0!important;padding:0!important;}");
  rules.push(".navbar-nav li{margin:0!important;padding:0!important;list-style:none!important;white-space:nowrap!important;}");
  rules.push(".navbar-cta,.navbar-wa{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;white-space:nowrap!important;padding:9px 16px!important;}");
  rules.push(".navbar-toggle{display:none!important;align-items:center!important;justify-content:center!important;flex-direction:column!important;gap:5px!important;width:46px!important;height:46px!important;min-width:46px!important;margin:0!important;padding:0!important;border:1px solid rgba(194,165,122,.45)!important;border-radius:0!important;background:rgba(30,22,8,.55)!important;color:#c2a57a!important;box-shadow:none!important;cursor:pointer!important;}");
  rules.push(".navbar-toggle span{display:block!important;width:21px!important;height:2px!important;background:#c2a57a!important;border-radius:2px!important;transition:transform .2s,opacity .2s!important;}.navbar-toggle[aria-expanded='true'] span:nth-child(1){transform:translateY(7px) rotate(45deg)!important;}.navbar-toggle[aria-expanded='true'] span:nth-child(2){opacity:0!important;}.navbar-toggle[aria-expanded='true'] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)!important;}");
  rules.push(".navbar-social{display:none!important;}");
  rules.push("html{overflow-x:hidden!important;}");
  rules.push("body{padding-top:104px!important;display:block!important;flex-flow:column nowrap!important;overflow:visible!important;overflow-x:hidden!important;}");
  // Header mobile: corrige z-index sobreposto e barra horizontal (editor + site)
  rules.push("@media(max-width:768px){html,body{overflow-x:hidden!important;} .navbar{overflow:visible!important; contain:none!important; z-index:9999!important; width:100%!important; max-width:100vw!important; left:0!important; right:0!important; box-sizing:border-box!important; transform:none!important; will-change:auto!important;} .navbar *{min-width:0!important; box-sizing:border-box!important;} .editor-frame, .editor-frame-device, .editor-frame-wrap{overflow:hidden!important; max-width:100%!important;} }");
  rules.push("body.ce-global-carousel, body.ce-global-carousel-track, html.ce-global-carousel, html.ce-global-carousel-track{display:block!important;flex-flow:column nowrap!important;overflow:visible!important;overflow-x:hidden!important;transform:none!important;}");
  rules.push("body.ce-global-carousel-track > *, html.ce-global-carousel > *{scroll-snap-align:none!important;}");
  rules.push("@media(max-width:1024px){.navbar{height:92px!important;min-height:92px!important;}.navbar-nav{display:none!important;position:absolute!important;top:100%!important;left:0!important;right:0!important;width:100%!important;flex:0 0 auto!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:0!important;background:#181107!important;border-top:1px solid rgba(194,165,122,.22)!important;border-bottom:1px solid rgba(194,165,122,.22)!important;box-shadow:0 22px 48px rgba(0,0,0,.34)!important;}.navbar.is-menu-open .navbar-nav{display:flex!important;}.navbar-nav li{width:100%!important;}.navbar-nav a{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:52px!important;padding:0 24px!important;border-bottom:1px solid rgba(194,165,122,.12)!important;}.navbar-toggle{display:inline-flex!important;}body{padding-top:92px!important;}}");
  rules.push("@media(max-width:768px){.navbar{height:190px!important;min-height:190px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:38px 56px 42px!important;align-items:center!important;padding:14px 20px 16px!important;row-gap:12px!important;column-gap:14px!important;}.navbar-social{grid-column:1/3!important;grid-row:1/2!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:22px!important;width:100%!important;padding-bottom:10px!important;border-bottom:1px solid rgba(194,165,122,.18)!important;}.navbar-social a{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:28px!important;height:28px!important;color:#e5d4b2!important;font-size:17px!important;}.navbar-social a:hover{color:#c2a57a!important;}.navbar-logo{grid-column:1/2!important;grid-row:2/3!important;}.navbar-toggle{grid-column:2/3!important;grid-row:2/3!important;}.navbar-cta,.navbar-wa{grid-column:1/3!important;grid-row:3/4!important;justify-content:center!important;width:100%!important;height:42px!important;min-height:42px!important;font-size:10px!important;padding:0 16px!important;letter-spacing:1.8px!important;}.navbar-logo .site-logo-icon,.navbar-logo .logo-symbol{width:44px!important;height:44px!important;flex-basis:44px!important;}.navbar-logo .site-logo-lettering{height:56px!important;max-width:190px!important;}.navbar-nav{top:190px!important;}.navbar-nav a{min-height:54px!important;padding:0 22px!important;}body{padding-top:190px!important;}}");
  rules.push(".hero{min-height:720px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important;padding-left:clamp(24px,6vw,96px)!important;padding-right:clamp(24px,6vw,96px)!important;box-sizing:border-box!important;}");
  rules.push(".hero .hero-content,.hero .hero-left,.hero>.elementor-widget-wrap{width:min(800px,100%)!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;text-align:center!important;}");
  rules.push(".hero>.elementor-widget-wrap>.elementor-element{width:100%!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .elementor-inner-column{width:100%!important;max-width:800px!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .elementor-widget{margin-left:auto!important;margin-right:auto!important;align-self:center!important;}");
  rules.push(".hero .elementor-widget-container,.hero .hero-title,.hero .hero-h,.hero .hero-label,.hero .hero-subtitle,.hero .hero-sub,.hero .hero-sub-italic,.hero .hero-products,.hero .hero-desc,.hero .hero-quote{text-align:center!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero h1,.hero .hero-title,.hero .hero-h{width:100%!important;max-width:800px!important;font-size:64px!important;line-height:1.08!important;}@media(max-width:768px){.hero h1,.hero .hero-title,.hero .hero-h{font-size:48px!important;}}");
  rules.push(".hero .hero-subtitle,.hero .hero-sub,.hero .hero-sub-italic,.hero .hero-products,.hero .hero-desc,.hero .hero-quote{max-width:760px!important;}");
  rules.push(".hero .hero-actions,.hero .hero-btns,.hero .hero-ctas{width:100%!important;justify-content:center!important;align-items:center!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .hero-search{width:min(560px,100%)!important;margin-left:auto!important;margin-right:auto!important;}");
  rules.push(".hero .hero-label{display:flex!important;align-items:center!important;justify-content:center!important;}");
  rules.push("@media(max-width:768px){.hero{min-height:calc(100svh - 118px)!important;padding-left:20px!important;padding-right:20px!important;}.hero .hero-actions,.hero .hero-btns,.hero .hero-ctas{flex-direction:column!important;}.hero .hero-actions>a,.hero .hero-btns>a,.hero .hero-ctas>a{width:100%!important;justify-content:center!important;text-align:center!important;}}");
  rules.push(".cta-final{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-height:390px!important;padding:76px clamp(24px,6vw,96px)!important;text-align:center!important;box-sizing:border-box!important;background:#1b1408!important;border-top:1px solid rgba(194,165,122,.16)!important;}");
  rules.push(".cta-final::before{display:none!important;}.cta-final .cta-title{width:100%!important;max-width:900px!important;margin:0 auto 12px!important;font-size:clamp(38px,4.5vw,64px)!important;line-height:1.08!important;text-align:center!important;}.cta-final .cta-sub{width:100%!important;max-width:720px!important;margin:0 auto 36px!important;line-height:1.6!important;text-align:center!important;}");
  rules.push(".cta-final .cta-btns{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;align-items:stretch!important;justify-content:center!important;gap:14px!important;width:min(940px,100%)!important;margin:0 auto!important;}.cta-final .cta-opt{display:grid!important;grid-template-rows:18px 54px!important;align-items:stretch!important;gap:8px!important;width:100%!important;min-width:0!important;margin:0!important;}.cta-final .cta-opt-label{display:block!important;width:100%!important;margin:0!important;text-align:center!important;line-height:18px!important;}");
  rules.push(".cta-final .cta-opt>a,.cta-final .btn-wa,.cta-final .btn-mustard,.cta-final .btn-ghost,.cta-final .btn-primary{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;width:100%!important;min-width:0!important;height:54px!important;min-height:54px!important;margin:0!important;padding:0 18px!important;box-sizing:border-box!important;white-space:nowrap!important;text-align:center!important;font-size:11px!important;line-height:1.2!important;letter-spacing:2px!important;}");
  rules.push(".wa-float.wa-float{position:fixed!important;right:28px!important;bottom:28px!important;left:auto!important;top:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;width:56px!important;max-width:56px!important;min-width:56px!important;height:56px!important;max-height:56px!important;min-height:56px!important;flex:0 0 56px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:#25d366!important;color:#fff!important;box-sizing:border-box!important;box-shadow:0 12px 26px rgba(7,94,84,.28)!important;z-index:2500!important;overflow:hidden!important;line-height:1!important;}");
  rules.push(".wa-float.wa-float:hover{background:#1fb155!important;transform:scale(1.06)!important;}.wa-float.wa-float,.wa-float.wa-float *{box-sizing:border-box!important;}.wa-float.wa-float .elementor-widget-container,.wa-float.wa-float .elementor-button-wrapper,.wa-float.wa-float .elementor-button,.wa-float.wa-float .elementor-button-content-wrapper{display:flex!important;align-items:center!important;justify-content:center!important;width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;max-width:56px!important;max-height:56px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;color:inherit!important;line-height:1!important;}");
  rules.push(".wa-float.wa-float .elementor-button-text{display:none!important;}.wa-float.wa-float .elementor-button-icon{display:flex!important;align-items:center!important;justify-content:center!important;width:56px!important;height:56px!important;margin:0!important;padding:0!important;color:inherit!important;}.wa-float.wa-float i,.wa-float.wa-float svg{display:block!important;width:30px!important;height:30px!important;font-size:30px!important;line-height:30px!important;color:#fff!important;fill:#fff!important;}");
  rules.push("@media(max-width:768px){.wa-float.wa-float{right:22px!important;bottom:22px!important;width:58px!important;max-width:58px!important;min-width:58px!important;height:58px!important;max-height:58px!important;min-height:58px!important;}.wa-float.wa-float .elementor-widget-container,.wa-float.wa-float .elementor-button-wrapper,.wa-float.wa-float .elementor-button,.wa-float.wa-float .elementor-button-content-wrapper,.wa-float.wa-float .elementor-button-icon{width:58px!important;height:58px!important;min-width:58px!important;min-height:58px!important;max-width:58px!important;max-height:58px!important;}.wa-float.wa-float i,.wa-float.wa-float svg{width:31px!important;height:31px!important;font-size:31px!important;line-height:31px!important;}}");
  rules.push(".footer:not(.ce-site-footer){display:none!important;}.ce-site-footer.footer{display:block!important;width:100%!important;margin:0!important;padding:0 clamp(24px,5vw,80px)!important;box-sizing:border-box!important;background:#120e08!important;color:#d8c9aa!important;border-top:1px solid rgba(194,165,122,.22)!important;}.ce-footer-main{display:grid!important;grid-template-columns:minmax(260px,1.1fr) minmax(300px,1fr) minmax(240px,.8fr)!important;gap:clamp(36px,6vw,92px)!important;align-items:start!important;padding:64px 0 52px!important;}.ce-footer-brand>a{display:flex!important;align-items:center!important;gap:12px!important;width:max-content!important;max-width:100%!important;text-decoration:none!important;}.ce-footer-icon{display:block!important;width:46px!important;height:46px!important;object-fit:contain!important;}.ce-footer-lettering{display:block!important;width:auto!important;height:58px!important;max-width:210px!important;object-fit:contain!important;}.ce-footer-nav>strong,.ce-footer-contact>strong{display:block!important;margin:0 0 20px!important;color:#c2a57a!important;font:700 10px/1.2 Arial,sans-serif!important;letter-spacing:3px!important;text-transform:uppercase!important;}.ce-footer-nav>div{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:13px 28px!important;}.ce-footer-nav a,.ce-footer-contact a,.ce-footer-contact span,.ce-footer-contact small{color:#b8aa90!important;font:500 11px/1.5 Arial,sans-serif!important;letter-spacing:1px!important;text-decoration:none!important;}.ce-footer-nav a:hover,.ce-footer-contact a:hover,.ce-footer-bottom a:hover{color:#e5d4b2!important;}.ce-footer-contact{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:11px!important;}.ce-footer-contact a{display:inline-flex!important;align-items:center!important;gap:8px!important;color:#77d99a!important;}.ce-footer-contact small{color:#756a57!important;text-transform:uppercase!important;letter-spacing:2px!important;}.ce-footer-bottom{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:24px!important;min-height:72px!important;padding:18px 0!important;border-top:1px solid rgba(194,165,122,.12)!important;}.ce-footer-bottom span,.ce-footer-bottom a{color:#6f6453!important;font:500 9px/1.5 Arial,sans-serif!important;letter-spacing:1.5px!important;text-decoration:none!important;text-transform:uppercase!important;}.ce-footer-bottom a{display:inline-flex!important;align-items:center!important;gap:7px!important;color:#a99570!important;}");
  rules.push("@media(max-width:900px){.cta-final .cta-btns{grid-template-columns:1fr!important;max-width:440px!important;}.cta-final .cta-opt{grid-template-rows:18px 52px!important;}.ce-footer-main{grid-template-columns:1fr 1fr!important;}.ce-footer-brand{grid-column:1/-1!important;}.ce-footer-bottom{align-items:flex-start!important;flex-direction:column!important;justify-content:center!important;}}@media(max-width:560px){.cta-final{min-height:auto!important;padding:58px 18px!important;}.cta-final .cta-title{font-size:38px!important;}.cta-final .cta-sub{margin-bottom:28px!important;}.cta-final .cta-opt>a,.cta-final .btn-wa,.cta-final .btn-mustard,.cta-final .btn-ghost,.cta-final .btn-primary{font-size:10px!important;letter-spacing:1.5px!important;}.ce-site-footer.footer{padding:0 22px!important;}.ce-footer-main{grid-template-columns:1fr!important;gap:36px!important;padding:48px 0 38px!important;}.ce-footer-brand{grid-column:auto!important;}.ce-footer-nav>div{grid-template-columns:1fr 1fr!important;}.ce-footer-bottom{min-height:92px!important;}.ce-footer-lettering{height:50px!important;max-width:185px!important;}}");
  rules.push(".ce-global-carousel{position:relative!important;width:100%!important;overflow:hidden!important;}");
  rules.push(".ce-global-carousel-track{display:flex!important;flex-flow:row nowrap!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-behavior:smooth!important;scroll-snap-type:x mandatory!important;scrollbar-width:none!important;-ms-overflow-style:none!important;overscroll-behavior-inline:contain!important;touch-action:pan-x pan-y!important;transform:none!important;cursor:grab!important;}");
  rules.push(".ce-global-carousel-track:active{cursor:grabbing!important;}.ce-global-carousel-track::-webkit-scrollbar{display:none!important;}.ce-global-carousel-track img{user-select:none!important;-webkit-user-drag:none!important;}.ce-global-carousel-track>*,.ce-global-carousel-track>.elementor-widget-wrap>*{scroll-snap-align:start;}");
  rules.push(".ce-global-carousel-nav{display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;width:100%!important;margin:20px auto 0!important;padding:0!important;position:relative!important;inset:auto!important;z-index:5!important;}");
  rules.push(".ce-global-carousel-button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:42px!important;height:42px!important;flex:0 0 42px!important;margin:0!important;padding:0!important;border:1px solid rgba(194,165,122,.72)!important;border-radius:0!important;background:rgba(24,21,16,.92)!important;color:#ead9b8!important;font-size:18px!important;line-height:1!important;cursor:pointer!important;transition:background .2s,color .2s,border-color .2s!important;}");
  rules.push(".ce-global-carousel-button:hover,.ce-global-carousel-button:focus-visible{background:#c2a57a!important;border-color:#c2a57a!important;color:#181510!important;outline:none!important;}.ce-global-carousel-button:focus-visible{box-shadow:0 0 0 3px rgba(194,165,122,.3)!important;}");
  rules.push(".ce-global-carousel-dots{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:52px!important;}.ce-global-carousel-dot{display:block!important;width:6px!important;height:6px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(194,165,122,.35)!important;transition:width .2s,background .2s!important;}.ce-global-carousel-dot.is-active{width:20px!important;border-radius:3px!important;background:#c2a57a!important;}");
  rules.push(".carousel-nav,.inst-nav,.insp-nav,.gal-nav,.gal-arrow,#galPrev2,#galNext2{display:none!important;}");
   rules.push("@media(max-width:768px){.ce-global-carousel-nav{margin-top:14px!important;gap:10px!important;}.ce-global-carousel-button{width:38px!important;height:38px!important;flex-basis:38px!important;}}");
   // Desktop/tablet: slides do carrossel com largura propria (importacao trouxe 240px inline, ficando minusculos no PC) — cortinas pediu maior
   rules.push("@media(min-width:769px){.ce-global-carousel-track>*{width:clamp(420px,34vw,640px)!important;}}");
  rules.push(".mot-video-ph video,.mot-video video,.mot-video-ph iframe,.mot-video iframe{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border:0!important;}");
  // Videos motorizados: grid padrao (2 colunas no desktop, empilhado no mobile) e nunca carrossel
  rules.push(".mot-videos .elementor-widget-wrap,.mot-videos.ce-exact-node > .elementor-widget-wrap,.ce-exact-page .mot-videos > .elementor-widget-wrap{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;overflow:visible!important;cursor:auto!important;}");
   rules.push("@media(max-width:768px){.mot-videos .elementor-widget-wrap,.mot-videos.ce-exact-node > .elementor-widget-wrap,.ce-exact-page .mot-videos > .elementor-widget-wrap{grid-template-columns:1fr!important;}}");
   // Motorizadas (persianas): frase centralizada e vídeos inteiros no celular (sem corte cover)
   rules.push("@media(max-width:768px){.motorizadas .eyebrow,.motorizadas .section-title,.motorizadas .mot-desc{text-align:center!important;}.motorizadas .rule{margin-left:auto!important;margin-right:auto!important;}.mot-video-ph:has(video),.mot-video:has(video),.mot-video-ph:has(iframe),.mot-video:has(iframe){aspect-ratio:auto!important;min-height:0!important;}.mot-video-ph video,.mot-video video{height:auto!important;object-fit:contain!important;}}");
   rules.push(".mot-video-ph:has(video),.mot-video:has(video),.mot-video-ph:has(iframe),.mot-video:has(iframe){background:#000!important;padding:0!important;height:auto!important;min-height:200px!important;aspect-ratio:16/9!important;}");
  // ── Fix persianas no mobile: video no enquadro certinho (vertical sem corte) — sobrepoe o 16/9 geral
  rules.push("@media(max-width:768px){.mot-video-ph:has(video),.mot-video:has(video),.mot-video-ph:has(iframe),.mot-video:has(iframe){aspect-ratio:auto!important;min-height:0!important;height:auto!important;background:#000!important;} .mot-video-ph video,.mot-video video,.mot-video-ph iframe,.mot-video iframe{height:auto!important;object-fit:contain!important;aspect-ratio:auto!important;width:100%!important;max-height:75vh!important;display:block!important;}}");
  rules.push(".ce-placeholder-image-host{position:relative!important;overflow:hidden!important;}.ce-placeholder-image-hidden{display:none!important;}");
  rules.push(".ce-placeholder-image-widget{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;padding:0!important;font-size:0!important;line-height:0!important;z-index:0!important;}");
  rules.push(".ce-placeholder-image-widget .elementor-widget-container,.ce-placeholder-image-widget .elementor-icon-wrapper{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;}");
  rules.push(".ce-placeholder-image-widget img{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;padding:0!important;object-fit:cover!important;}.ce-placeholder-image-widget img~img{display:none!important;}");
  // ── Foto real (background da coluna) tem prioridade sobre placeholder <img> empilhado
  rules.push(".inst-ph[style*=\"background-image\"] .elementor-icon-wrapper img,.elementor-column[style*=\"background-image\"] .ce-exact-icon .elementor-icon-wrapper img{display:none!important;}");
  // ── Home fixes: categorias com foto de fundo (cliente adicionou background-image via editor)
  rules.push(".categorias .cat-grid .cat-card{position:relative!important;overflow:hidden!important;background-size:cover!important;background-position:center!important;min-height:220px!important;}");
  rules.push(".categorias .cat-grid .cat-card::before{content:''!important;position:absolute!important;inset:0!important;background:linear-gradient(to top, rgba(18,14,8,0.88) 0%, rgba(18,14,8,0.55) 45%, rgba(18,14,8,0.18) 100%)!important;z-index:0!important;pointer-events:none!important;}");
  rules.push(".categorias .cat-grid .cat-card > *{position:relative!important;z-index:1!important;}");
  rules.push(".categorias .cat-grid .cat-card .cat-nome{color:#f5eed8!important;text-shadow:0 1px 10px rgba(0,0,0,0.75)!important;font-size:17px!important;}");
  rules.push(".categorias .cat-grid .cat-card .cat-desc{color:#e8dcc0!important;text-shadow:0 1px 6px rgba(0,0,0,0.65)!important;}");
  rules.push(".categorias .cat-grid .cat-card .cat-link{color:#c2a57a!important;text-shadow:0 1px 4px rgba(0,0,0,0.5)!important;}");
  rules.push(".categorias .cat-grid .cat-card .cat-icon{filter:drop-shadow(0 1px 6px rgba(0,0,0,0.6))!important;}");
  // Evita imagens soltas do editor vazarem fora das seções (defeito Image 7)
  rules.push(".categorias, .porque, .depoimentos, .faq, .cta-final, .instalações{overflow:hidden!important;}");
  rules.push(".cta-final .cta-bg-word{pointer-events:none!important;}");
  // Home CTA original é grid 1fr 1fr (home.html), não flex centralizado global
  rules.push(".cta-final:has(.cta-right){display:grid!important;grid-template-columns:1fr 1fr!important;gap:clamp(40px,6vw,100px)!important;align-items:center!important;text-align:left!important;min-height:auto!important;padding:120px clamp(24px,5vw,80px)!important;}");
  rules.push("@media(max-width:768px){.cta-final:has(.cta-right){grid-template-columns:1fr!important;padding:80px 20px!important;}}");
  // ── Pisos: comparativo nunca transborda na tela (fica inteiro no viewport)
  rules.push(".comparativo{overflow-x:clip!important;box-sizing:border-box!important;max-width:100%!important;}");
  rules.push(".comp-table{width:100%!important;max-width:100%!important;table-layout:fixed!important;}");
  rules.push(".comp-table th,.comp-table td{word-break:break-word!important;overflow-wrap:anywhere!important;}");
  rules.push("@media(max-width:768px){.comp-table th{padding:10px 4px!important;font-size:8px!important;letter-spacing:.8px!important;}.comp-table td{padding:12px 4px!important;font-size:11px!important;}.comp-table th:first-child,.comp-table td:first-child{width:72px!important;}.comp-table th:last-child,.comp-table td:last-child{width:70px!important;}.comp-table td:first-child{font-size:10px!important;overflow-wrap:normal!important;word-break:normal!important;}.comp-table .comp-tag{font-size:9px!important;padding:3px 6px!important;}}");
  // Porque carousel: preserva layout grid original do home, não força flex global
  rules.push(".porque .carousel-track:not(.ce-global-carousel-track){display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:2px!important;transform:none!important;overflow:visible!important;}");
  rules.push("@media(max-width:768px){.porque .carousel-track:not(.ce-global-carousel-track){grid-template-columns:1fr!important;}}");
  // FAQ fechado por padrão com "+" nas perguntas (pedido cliente) — seletor SEM .ce-exact-page
  // (o body real é elementor-page-XXXX, sem .ce-exact-page, então a regra antiga nunca casava e as respostas ficavam abertas).
  // Ícone: esconde o <i class="fas fa-plus"> (Font Awesome não carrega — virava quadrado vazio) e desenha o "+" via CSS, igual às outras abas.
  rules.push(".elementor-toggle .elementor-tab-content{display:none!important;padding:0 18px 0!important;overflow:hidden!important;}.elementor-toggle .elementor-tab-title.elementor-active + .elementor-tab-content,.elementor-toggle .elementor-tab-title[aria-expanded=\"true\"] + .elementor-tab-content{display:block!important;padding:0 18px 19px!important;}.elementor-toggle .elementor-tab-title{display:flex!important;align-items:center!important;gap:12px!important;cursor:pointer!important;}.elementor-toggle .elementor-toggle-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:22px!important;height:22px!important;min-width:22px!important;border:1px solid rgba(194,165,122,.35)!important;color:var(--fendi,#c2a57a)!important;flex:0 0 22px!important;position:relative!important;}.elementor-toggle .elementor-toggle-icon i,.elementor-toggle .elementor-toggle-icon svg{display:none!important;}.elementor-toggle .elementor-toggle-icon::after{content:\"+\"!important;display:block!important;font-size:16px!important;line-height:1!important;font-weight:400!important;transition:transform .2s!important;}.elementor-toggle .elementor-tab-title.elementor-active .elementor-toggle-icon::after,.elementor-toggle .elementor-tab-title[aria-expanded=\"true\"] .elementor-toggle-icon::after{transform:rotate(45deg)!important;} .faq-item .faq-a{max-height:0!important;overflow:hidden!important;padding-bottom:0!important;transition:max-height .35s ease!important;} .faq-item.open .faq-a{max-height:500px!important;padding-bottom:18px!important;} .faq-item .faq-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:22px!important;height:22px!important;border:1px solid rgba(194,165,122,.35)!important;color:var(--fendi,#c2a57a)!important;} .faq-item .faq-q i{transition:transform .2s!important;display:block!important;} .faq-item.open .faq-q i{transform:rotate(45deg)!important;} .faq-item .faq-q[aria-expanded=\"true\"]{color:var(--fendi,#c2a57a)!important;}");
  // ── Papeis: álbuns clean sem botão + 2 colunas no mobile (Image1/4)
  rules.push("@media(max-width:768px){.album-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}} .album-grid .album-btn,.cat-section .album-btn{display:none!important;} .album-card{cursor:pointer!important;transition:transform .2s, box-shadow .2s!important;} .album-card:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(0,0,0,.22)!important;}");
  // ── Papeis: filtro por categoria — seção filtrada não fica escondida atrás do header fixo
  rules.push(".cat-section{scroll-margin-top:200px!important;}@media(max-width:768px){.cat-section{scroll-margin-top:200px!important;}}");
  // ── Papeis: calculadora — botão Calcular full-width + quadro de resposta (ficavam ocultos/fora do lugar)
  rules.push("#ceCalcBtn{display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;width:100%!important;min-height:52px!important;margin:12px 0 0!important;padding:10px 14px!important;background:#c2a57a!important;border:1px solid #c2a57a!important;color:#181510!important;font-weight:700!important;font-size:11px!important;letter-spacing:1px!important;text-transform:uppercase!important;white-space:normal!important;line-height:1.4!important;cursor:pointer!important;box-sizing:border-box!important;}");
  rules.push("#ceCalcResultado{scroll-margin-top:200px!important;width:100%!important;margin-top:14px!important;padding:16px 18px!important;background:rgba(194,165,122,.12)!important;border:1px solid rgba(194,165,122,.45)!important;color:#f5eed8!important;font-size:14px!important;line-height:1.65!important;box-sizing:border-box!important;}#ceCalcResultado strong{color:#c2a57a!important;}");
  // ── Botânica e similares: produtos com 1 fileira só → força 2 colunas
  rules.push("@media(max-width:768px){.ce-product-grid, .prod-grid, .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}}");
  // ── Corporativo: logos dos cases visíveis (sem filtro branco) e vídeo completo (sem corte)
  rules.push(".caso-logo .caso-logo-img{background:transparent!important;border:none!important;border-radius:0!important;padding:0!important;width:auto!important;height:auto!important;box-shadow:none!important;}");
  rules.push(".caso-logo{background:transparent!important;border:none!important;box-shadow:none!important;}");
  rules.push(".caso-logo:has(.caso-logo-img){width:auto!important;height:auto!important;flex:0 0 auto!important;}");
  rules.push(".caso-logo-img img{filter:brightness(0) invert(1)!important;opacity:.92!important;height:82px!important;width:auto!important;max-width:none!important;max-height:none!important;object-fit:contain!important;}");  rules.push("@media(max-width:768px){.caso-logo-img img{height:64px!important;}}");
  // Rodape padrao: largura total, sem calha, alinhado a esquerda em todas as paginas
  rules.push(".ce-site-footer.footer{margin:0!important;width:100%!important;}");
  rules.push(".ce-site-footer.footer,.ce-site-footer .ce-footer-main,.ce-site-footer .ce-footer-main a,.ce-site-footer .ce-footer-main span,.ce-site-footer .ce-footer-main small{text-align:left!important;}");
  // Arquitetos: blocos mais compactos no celular (pedido da cliente) - frase centralizada abaixo do icone
  rules.push("@media(max-width:768px){.quem-somos{padding:44px 20px 40px!important;}.quem-somos .block-title{font-size:30px!important;}.quem-somos-inner{gap:22px!important;margin-bottom:0!important;}.quem-text{font-size:14px!important;line-height:1.7!important;}.beneficios{padding:44px 20px 40px!important;}.ben-grid{margin-top:24px!important;}.ben-card{padding:22px 16px!important;}.ben-icon{font-size:20px!important;margin-bottom:10px!important;}.ben-title{font-size:19px!important;margin-bottom:8px!important;}.ben-desc{font-size:15px!important;line-height:1.6!important;}.clube{padding:44px 20px!important;gap:20px!important;}.clube-left .block-title,.clube-desc{text-align:center!important;}.clube-right{gap:10px!important;}.clube-item{padding:16px 12px!important;text-align:center!important;align-items:center!important;justify-content:center!important;}.clube-item-icon{margin:0 auto 8px!important;display:flex!important;align-items:center!important;justify-content:center!important;}.clube-item-title{text-align:center!important;width:100%!important;display:block!important;}.cadastro{padding:44px 20px!important;gap:20px!important;}.cadastro .block-title{font-size:30px!important;}.cadastro .block-sub{font-size:14px!important;}.form-grid{gap:12px!important;}.form-input{padding:11px 12px!important;font-size:13px!important;}}");  rules.push("@media(max-width:768px){.caso-header{padding-left:20px!important;padding-right:20px!important;gap:16px!important;}}");
  // ── Corporativo: seções escuras coladas nas bordas no mobile (sem calha branca)
  rules.push("@media(max-width:768px){.elementor-widget-container > .intro,.elementor-widget-container > .solucoes,.elementor-widget-container > .diferenciais,.elementor-widget-container > .processo,.elementor-widget-container > .video-sec,.elementor-widget-container > .cta-final{margin-left:-20px!important;margin-right:-20px!important;}}");
  rules.push(".video-wrap video{object-fit:contain!important;}");
  // Simbolos Font Awesome (play) deixados sobre fotos/videos por importacao antiga — ocultos
  rules.push(".elementor-icon-wrapper i.fas.fa-play,.elementor-icon-wrapper i.fas.fa-video,.elementor-icon-wrapper i.fas.fa-film{display:none!important;}");
  // ── Pisos: no mobile a caixa de vídeo acompanha o formato do vídeo (vertical fica grande)
  rules.push("@media(max-width:768px){.media-video-box,.video-wrap{flex:none!important;display:block!important;}.media-video-box video{width:100%!important;height:auto!important;flex:none!important;object-fit:contain!important;display:block!important;}}");
  // ── Papel de parede: sequência de passos (1-5) fica AO LADO no mobile, como no desktop (pedido da cliente) — vence o override inline salvo no banco
  rules.push("@media(max-width:768px){.proc-steps{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:2px!important;}.proc-steps::before{display:block!important;top:15px!important;left:22px!important;right:22px!important;}.proc-step{padding:0 3px!important;}.proc-num{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;margin:0 auto 12px!important;font-size:12px!important;}.proc-title{font-size:11px!important;line-height:1.25!important;margin-bottom:6px!important;}.proc-desc{font-size:9.5px!important;line-height:1.5!important;}}");
  // ── Corporativo/Pisos: "Como trabalhamos / Seu projeto passo a passo" lado a lado no mobile, igual ao Papel de Parede (Image1 -> Image2)
  rules.push("@media(max-width:768px){.processo{padding:40px 16px!important;}.processo .steps{display:flex!important;flex-wrap:nowrap!important;gap:0!important;margin-top:28px!important;}.processo .steps::before{display:block!important;top:15px!important;left:22px!important;right:22px!important;opacity:.25!important;}.processo .step{flex:1 1 0!important;min-width:0!important;padding:0 4px!important;text-align:center!important;background:transparent!important;border-top:none!important;}.processo .step-dot{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;margin:0 auto 12px!important;}.processo .step-dot-num{font-size:12px!important;}.processo .step-nome{font-size:11px!important;line-height:1.25!important;margin-bottom:6px!important;text-align:center!important;}.processo .step-desc{font-size:9.5px!important;line-height:1.5!important;text-align:center!important;}}");
  if (settings.primaryColor) root.push(`--fendi:${settings.primaryColor};`);
  if (settings.accentColor) root.push(`--mustard:${settings.accentColor};`);
  if (settings.fontFamily) {
    rules.push(`body{font-family:'${String(settings.fontFamily).replaceAll("'", "")}',sans-serif;}`);
  }
  if (root.length) rules.push(`:root{${root.join("")}}`);
  if (settings.css) rules.push(settings.css);
  return rules.join("\n");
}

function hasCarouselMarkup(html) {
  return /data-ce-widget=["']carousel["']|class=["'][^"']*(?:carousel-track|inst-track|insp-track|gal-track)\b/i.test(html);
}

const LIGHTBOX_GALLERY_CLASSES = [
  "album-thumb",
  "prod-thumb",
  "ce-category-image",
  "ce-product-media",
  "insp-slide",
  "inst-slide",
  "media-foto",
  "gal-item"
];

function hasLightboxMarkup(html) {
  return LIGHTBOX_GALLERY_CLASSES.some((className) => {
    const pattern = new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>\\s*<img`, "i");
    return pattern.test(html);
  });
}

function buildGlobalLightboxStyles() {
  return `.ce-lightbox-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(10,8,4,.94);opacity:0;visibility:hidden;transition:opacity .2s;padding:24px;box-sizing:border-box;}
.ce-lightbox-overlay.is-open{opacity:1;visibility:visible;}
.ce-lightbox-figure{position:relative;max-width:min(1100px,92vw);max-height:88vh;display:flex;align-items:center;justify-content:center;}
.ce-lightbox-figure img{display:block;max-width:100%;max-height:88vh;width:auto;height:auto;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.5);}
.ce-lightbox-close,.ce-lightbox-prev,.ce-lightbox-next{position:fixed;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:1px solid rgba(194,165,122,.45);border-radius:50%;background:rgba(24,21,16,.85);color:#ead9b8;font-size:20px;cursor:pointer;transition:background .2s,color .2s,border-color .2s;z-index:9001;}
.ce-lightbox-close:hover,.ce-lightbox-prev:hover,.ce-lightbox-next:hover{background:#c2a57a;border-color:#c2a57a;color:#181510;}
.ce-lightbox-close{top:24px;right:24px;}
.ce-lightbox-prev{left:24px;top:50%;transform:translateY(-50%);}
.ce-lightbox-next{right:24px;top:50%;transform:translateY(-50%);}
.ce-lightbox-counter{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:#ead9b8;font:600 11px/1.3 Arial,sans-serif;letter-spacing:2px;background:rgba(24,21,16,.72);padding:8px 16px;border-radius:2px;z-index:9001;}
.ce-lightbox-caption{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);max-width:min(680px,90vw);text-align:center;color:#e8dcc0;font:400 13px/1.5 Arial,sans-serif;background:rgba(24,21,16,.78);padding:10px 18px;border-radius:4px;border:1px solid rgba(194,165,122,.3);z-index:9001;}
.album-thumb img,.prod-thumb img,.ce-category-image img,.ce-product-media img,.insp-slide img,.inst-slide img,.media-foto img,.gal-item img{cursor:zoom-in;}
@media(max-width:768px){.ce-lightbox-prev{left:10px;width:42px;height:42px;}.ce-lightbox-next{right:10px;width:42px;height:42px;}.ce-lightbox-close{top:14px;right:14px;width:42px;height:42px;}}`;
}

function buildGlobalLightboxScript() {
  const gallerySelector = LIGHTBOX_GALLERY_CLASSES.map((className) => `.${className} img`).join(",");
  return `(() => {
    const gallerySelector = ${JSON.stringify(gallerySelector)};

    function buildOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'ce-lightbox-overlay';
      overlay.innerHTML = '<button class="ce-lightbox-close" type="button" aria-label="Fechar"><i class="ti ti-x" aria-hidden="true"></i></button><button class="ce-lightbox-prev" type="button" aria-label="Imagem anterior"><i class="ti ti-chevron-left" aria-hidden="true"></i></button><button class="ce-lightbox-next" type="button" aria-label="Proxima imagem"><i class="ti ti-chevron-right" aria-hidden="true"></i></button><div class="ce-lightbox-figure"><img alt=""></div><div class="ce-lightbox-counter"></div><div class="ce-lightbox-caption"></div>';
      document.body.appendChild(overlay);
      return overlay;
    }

    function boot() {
      const images = Array.from(document.querySelectorAll(gallerySelector)).filter((img) => img.src);
      if (!images.length) return;

      const overlay = buildOverlay();
      const figureImg = overlay.querySelector('.ce-lightbox-figure img');
      const counter = overlay.querySelector('.ce-lightbox-counter');
      const caption = overlay.querySelector('.ce-lightbox-caption');
      const closeBtn = overlay.querySelector('.ce-lightbox-close');
      const prevBtn = overlay.querySelector('.ce-lightbox-prev');
      const nextBtn = overlay.querySelector('.ce-lightbox-next');
      let currentGroup = [];
      let currentIndex = 0;

      function groupOf(img) {
        const scope = img.closest('.album-grid,.prod-grid,.ce-category-grid,.ce-product-grid,.insp-track,.inst-track,.gal-track') || document;
        return images.filter((candidate) => scope.contains(candidate));
      }

      function show(index) {
        if (!currentGroup.length) return;
        currentIndex = (index + currentGroup.length) % currentGroup.length;
        const target = currentGroup[currentIndex];
        figureImg.src = target.currentSrc || target.src;
        figureImg.alt = target.alt || '';
        counter.textContent = currentGroup.length > 1 ? (currentIndex + 1) + ' / ' + currentGroup.length : '';
        // Legenda: usa o alt da imagem (ex.: "Whisper 36412" — nome + referência)
        caption.textContent = target.alt || '';
        caption.style.display = target.alt ? 'block' : 'none';
        const multiple = currentGroup.length > 1;
        prevBtn.style.display = multiple ? 'flex' : 'none';
        nextBtn.style.display = multiple ? 'flex' : 'none';
      }

      function open(img) {
        currentGroup = groupOf(img);
        show(currentGroup.indexOf(img));
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }

      function close() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      }

      images.forEach((img) => {
        img.addEventListener('click', (event) => {
          // Se a imagem está dentro de um link (ex.: card de categoria/álbum
          // que leva a uma página), NÃO abrir o lightbox — deixa o link
          // navegar normalmente.
          if (img.closest('a[href]')) return;
          event.preventDefault();
          open(img);
        });
      });

      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', () => show(currentIndex - 1));
      nextBtn.addEventListener('click', () => show(currentIndex + 1));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
      });
      document.addEventListener('keydown', (event) => {
        if (!overlay.classList.contains('is-open')) return;
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowLeft') show(currentIndex - 1);
        if (event.key === 'ArrowRight') show(currentIndex + 1);
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  })();`;
}

function buildGlobalSearchStyles() {
  return `.navbar-search{position:relative;display:flex;align-items:center;flex:0 0 auto;}
.navbar-search-toggle{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid rgba(194,165,122,.35);border-radius:50%;background:transparent;color:#c2a57a;font-size:16px;cursor:pointer;transition:background .2s,color .2s;}
.navbar-search-toggle:hover{background:rgba(194,165,122,.12);}
.navbar-search-form{position:absolute;top:calc(100% + 10px);right:0;width:320px;max-width:90vw;background:#181510;border:1px solid rgba(194,165,122,.25);box-shadow:0 20px 40px rgba(0,0,0,.4);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .18s,transform .18s,visibility .18s;z-index:500;}
.navbar-search.is-open .navbar-search-form{opacity:1;visibility:visible;transform:translateY(0);}
.navbar-search-input{width:100%;box-sizing:border-box;background:rgba(194,165,122,.06);border:none;border-bottom:1px solid rgba(194,165,122,.18);outline:none;padding:14px 16px;font:400 13px/1.4 'Montserrat',Arial,sans-serif;color:#f5eed8;}
.navbar-search-input::placeholder{color:rgba(194,165,122,.4);}
.navbar-search-results{max-height:360px;overflow-y:auto;}
.navbar-search-results:not([hidden]){display:block;}
.navbar-search-item{display:flex;align-items:center;gap:10px;padding:10px 16px;text-decoration:none;color:#e5d4b2;font-size:12px;border-bottom:1px solid rgba(194,165,122,.08);}
.navbar-search-item:hover{background:rgba(194,165,122,.08);}
.navbar-search-item img{width:34px;height:34px;object-fit:cover;flex:0 0 34px;background:#2e2410;}
.navbar-search-item strong{display:block;font-weight:600;}
.navbar-search-item span{display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#a89370;margin-top:2px;}
.navbar-search-empty,.navbar-search-hint{padding:16px;font-size:11px;color:#a89370;text-align:center;}
@media(max-width:1024px){.navbar-search-form{right:auto;left:0;}}
@media(max-width:768px){.navbar-search-form{position:fixed;top:auto;left:12px;right:12px;width:auto;}}
`;
}

function buildGlobalSearchScript() {
  return `(() => {
  function debounce(fn, wait) {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function setupSearch(root) {
    const toggle = root.querySelector('.navbar-search-toggle');
    const form = root.querySelector('.navbar-search-form');
    const input = root.querySelector('.navbar-search-input');
    const results = root.querySelector('.navbar-search-results');
    if (!toggle || !form || !input || !results || toggle.dataset.ceReady === '1') return;
    toggle.dataset.ceReady = '1';

    function setOpen(open) {
      root.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) window.setTimeout(() => input.focus(), 50);
    }

    function renderResults(data) {
      const categories = data.categories || [];
      const products = data.products || [];
      if (!categories.length && !products.length) {
        results.innerHTML = '<div class="navbar-search-empty">Nenhum resultado encontrado.</div>';
        results.hidden = false;
        return;
      }
      const categoryItems = categories.slice(0, 5).map((category) => (
        '<a class="navbar-search-item" href="/categoria-produto/' + encodeURI(category.path) + '"><img src="' + (category.image_url || '/assets/logo-icone.svg') + '" alt=""><span class="navbar-search-item-text"><strong>' + escapeHtml(category.name) + '</strong><span>Categoria</span></span></a>'
      )).join('');
      const productItems = products.slice(0, 8).map((product) => (
        '<a class="navbar-search-item" href="/produto/' + encodeURIComponent(product.slug) + '"><img src="' + (product.image_url || '/assets/logo-icone.svg') + '" alt=""><span class="navbar-search-item-text"><strong>' + escapeHtml(product.name) + '</strong><span>' + escapeHtml(product.sku || 'Produto') + '</span></span></a>'
      )).join('');
      results.innerHTML = categoryItems + productItems;
      results.hidden = false;
    }

    function escapeHtml(value) {
      return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const runSearch = debounce((query) => {
      if (!query) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }
      results.innerHTML = '<div class="navbar-search-hint">Buscando...</div>';
      results.hidden = false;
      fetch('/api/search?q=' + encodeURIComponent(query))
        .then((response) => response.json())
        .then(renderResults)
        .catch(() => {
          results.innerHTML = '<div class="navbar-search-empty">Erro ao buscar. Tente novamente.</div>';
        });
    }, 280);

    toggle.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
    input.addEventListener('input', (event) => runSearch(event.target.value.trim()));
    form.addEventListener('submit', (event) => event.preventDefault());
    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function wireHeroSearch(hero) {
    if (hero.dataset.ceReady === '1') return;
    hero.dataset.ceReady = '1';
    const input = hero.querySelector('input');
    const button = hero.querySelector('button');
    if (!input) return;
    function go() {
      const query = input.value.trim();
      if (!query) return;
      window.location.href = '/catalogo?busca=' + encodeURIComponent(query);
    }
    if (button) button.addEventListener('click', (event) => { event.preventDefault(); go(); });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); go(); }
    });
  }

  function boot() {
    document.querySelectorAll('.navbar-search').forEach(setupSearch);
    document.querySelectorAll('.hero-search').forEach(wireHeroSearch);
  }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else window.requestAnimationFrame(boot);
  })();`;
}

function buildMostruarioVideoScript() {
  return `(() => {
    function fitBox(video) {
      const box = video.closest ? video.closest('.media-video-box,.video-wrap') : null;
      if (!box) return;
      const apply = () => {
        const w = video.videoWidth, h = video.videoHeight;
        if (!w || !h) return;
        box.style.setProperty('aspect-ratio', w + ' / ' + h, 'important');
        box.style.setProperty('height', 'auto', 'important');
      };
      if (video.readyState >= 1) apply();
      video.addEventListener('loadedmetadata', apply);
      video.addEventListener('resize', apply);
    }
    function init() { document.querySelectorAll('.media-video-box video,.video-wrap video').forEach(fitBox); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();`;
}

function buildMotVideoScript() {
  return `(() => {
    function fitSlot(video) {
      const slot = video.closest ? video.closest('.mot-video-ph,.mot-video,[data-video-slot]') : null;
      if (!slot) return;
      const apply = () => {
        const w = video.videoWidth, h = video.videoHeight;
        if (!w || !h) return;
        const ratio = Math.min(Math.max(w / h, 0.5), 16 / 9);
        slot.style.setProperty('aspect-ratio', String(Math.round(ratio * 10000) / 10000), 'important');
        slot.style.setProperty('min-height', '0px', 'important');
      };
      if (video.readyState >= 1) apply();
      else video.addEventListener('loadedmetadata', apply, { once: true });
    }
    function fix(video) {
      if (!video || video.dataset.ceMotFix === 'true') return;
      video.dataset.ceMotFix = 'true';
      fitSlot(video);
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.muted = true;
      video.setAttribute('muted', '');
      const attempt = () => {
        const promise = video.play();
        if (promise && promise.catch) promise.catch(() => { video.controls = true; });
      };
      if (video.readyState >= 2) attempt();
      else video.addEventListener('loadeddata', attempt, { once: true });
      video.addEventListener('error', () => { video.controls = true; }, { once: true });
      window.setTimeout(() => { if (video.paused || video.ended) video.controls = true; }, 3500);
      video.addEventListener('click', () => { if (video.paused) { video.controls = true; const p = video.play(); if (p && p.catch) p.catch(() => {}); } });
    }
    function boot() {
      document.querySelectorAll('.mot-video video, .mot-video-ph video').forEach(fix);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  })();`;
}

function buildGlobalNavScript() {
  return `(() => {
    function setupNavbar(navbar) {
      const toggle = navbar.querySelector('.navbar-toggle');
      const menu = navbar.querySelector('.navbar-nav');
      if (!toggle || !menu || toggle.dataset.ceReady === '1') return;
      toggle.dataset.ceReady = '1';
      if (!menu.id) menu.id = toggle.getAttribute('aria-controls') || 'navbar-mobile-menu';
      toggle.setAttribute('aria-controls', menu.id);

      function setOpen(open) {
        navbar.classList.toggle('is-menu-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.documentElement.classList.toggle('ce-menu-open', open);
      }

      toggle.addEventListener('click', () => setOpen(!navbar.classList.contains('is-menu-open')));
      menu.addEventListener('click', (event) => {
        if (event.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
      });
      document.addEventListener('click', (event) => {
        if (!navbar.contains(event.target)) setOpen(false);
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) setOpen(false);
      }, { passive: true });
    }

    function boot() {
      document.querySelectorAll('.navbar').forEach(setupNavbar);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  })();`;
}

function buildGlobalCarouselScript() {
  return `(() => {
    const candidateSelector = '[data-ce-widget="carousel"],.carousel-track,.inst-track,.insp-track,.gal-track';
    const rootSelector = '.carousel-wrap,.inst-carousel-wrap,.insp-carousel-wrap,.gal-carousel-wrap,#galWrap2,[id$="CarouselWrap"],[id$="carousel-wrap"]';
    const initialized = new WeakSet();

    function dimensions(element) {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, client: element.clientWidth, scroll: element.scrollWidth };
    }

    function findTrack(candidate) {
      let element = candidate;
      for (let depth = 0; element && depth < 7; depth += 1, element = element.parentElement) {
        if (!element || element === document.body || element === document.documentElement) continue;
        const size = dimensions(element);
        if (size.width > 0 && size.client > 0 && size.scroll > size.client + 4) return element;
      }
      return null;
    }

    function findRoot(track) {
      let element = track;
      for (let depth = 0; element && depth < 9; depth += 1, element = element.parentElement) {
        if (!element || element === document.body || element === document.documentElement) continue;
        if (element.matches(rootSelector)) return element;
      }
      const parent = track.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) return track;
      return parent;
    }

    function initialize(track, index) {
      if (!track || track === document.body || track === document.documentElement || initialized.has(track)) return;
      // Home "porque" grid não é carrossel infinito; preserva layout original
      if (track.closest && track.closest('.porque')) return;
      // Vídeos motorizados ficam empilhados (padrão pedido pela cliente), nunca carrossel
      if (track.closest && track.closest('.mot-videos')) return;
      if (track.id === 'inst-track' && document.querySelector('.porque .carousel-track')) return;
      initialized.add(track);
      const root = findRoot(track);
      root.classList.add('ce-global-carousel');
      track.classList.add('ce-global-carousel-track');
      track.setAttribute('role', 'region');
      track.setAttribute('aria-roledescription', 'carrossel');
      track.setAttribute('aria-label', track.getAttribute('data-ce-label') || 'Galeria de imagens');
      track.tabIndex = 0;

      const nav = document.createElement('div');
      nav.className = 'ce-global-carousel-nav';
      nav.setAttribute('aria-label', 'Navegacao do carrossel');
      nav.innerHTML = '<button class="ce-global-carousel-button" type="button" aria-label="Imagem anterior"><i class="ti ti-chevron-left" aria-hidden="true"></i></button><div class="ce-global-carousel-dots" aria-hidden="true"></div><button class="ce-global-carousel-button" type="button" aria-label="Proxima imagem"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>';
      root.insertAdjacentElement('afterend', nav);

      const previous = nav.firstElementChild;
      const dots = nav.children[1];
      const next = nav.lastElementChild;
      let pageCount = 1;
      let scrollFrame = 0;
      let autoplay = 0;
      let dragStartX = 0;
      let dragStartScroll = 0;
      let dragging = false;

      function maximum() {
        return Math.max(0, track.scrollWidth - track.clientWidth);
      }

      function step() {
        return Math.max(1, Math.round(track.clientWidth * 0.82));
      }

      function activePage() {
        const max = maximum();
        if (!max || pageCount < 2) return 0;
        return Math.min(pageCount - 1, Math.round((track.scrollLeft / max) * (pageCount - 1)));
      }

      function update() {
        const max = maximum();
        pageCount = Math.max(1, Math.ceil((track.scrollWidth - 2) / Math.max(1, track.clientWidth)));
        dots.replaceChildren(...Array.from({ length: pageCount }, (_, dotIndex) => {
          const dot = document.createElement('span');
          dot.className = 'ce-global-carousel-dot' + (dotIndex === activePage() ? ' is-active' : '');
          return dot;
        }));
        nav.hidden = max < 5;
      }

      function updateActiveDot() {
        const current = activePage();
        Array.from(dots.children).forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === current));
      }

      function move(direction) {
        const max = maximum();
        if (max < 5) return;
        let target = track.scrollLeft + (step() * direction);
        if (direction > 0 && track.scrollLeft >= max - 8) target = 0;
        if (direction < 0 && track.scrollLeft <= 8) target = max;
        track.scrollTo({ left: Math.max(0, Math.min(max, target)), behavior: 'smooth' });
      }

      function stopAutoplay() {
        if (autoplay) window.clearInterval(autoplay);
        autoplay = 0;
      }

      function startAutoplay() {
        stopAutoplay();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || maximum() < 5) return;
        autoplay = window.setInterval(() => move(1), 5000 + (index * 180));
      }

      previous.addEventListener('click', () => { move(-1); startAutoplay(); });
      next.addEventListener('click', () => { move(1); startAutoplay(); });
      track.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
          startAutoplay();
        }
      });
      track.addEventListener('scroll', () => {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(() => { scrollFrame = 0; updateActiveDot(); });
      }, { passive: true });
      track.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        dragging = true;
        dragStartX = event.clientX;
        dragStartScroll = track.scrollLeft;
        track.setPointerCapture(event.pointerId);
        stopAutoplay();
      });
      track.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        track.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
      });
      track.addEventListener('pointerup', (event) => {
        if (!dragging) return;
        dragging = false;
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        startAutoplay();
      });
      track.addEventListener('pointercancel', () => { dragging = false; startAutoplay(); });
      [root, nav].forEach((element) => {
        element.addEventListener('pointerenter', stopAutoplay);
        element.addEventListener('pointerleave', startAutoplay);
        element.addEventListener('focusin', stopAutoplay);
        element.addEventListener('focusout', startAutoplay);
      });
      window.addEventListener('resize', update, { passive: true });
      update();
      startAutoplay();
    }

    function boot() {
      // corrige estado quebrado anterior onde body/html viraram carrossel
      document.body.classList.remove('ce-global-carousel','ce-global-carousel-track');
      document.documentElement.classList.remove('ce-global-carousel','ce-global-carousel-track');
      // se body/html ainda estiver com estilo inline de carrossel, reseta
      if (document.body.style.display === 'flex' && document.body.style.flexFlow.includes('row')) {
        document.body.style.display = ''; document.body.style.flexFlow = ''; document.body.style.overflowX = ''; document.body.style.overflowY = '';
      }
      const tracks = new Set();
      document.querySelectorAll(candidateSelector).forEach((candidate) => {
        const track = findTrack(candidate);
        if (track) tracks.add(track);
      });
      Array.from(tracks).forEach(initialize);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else window.requestAnimationFrame(boot);
  })();`;
}

function buildImagePlaceholderScript() {
  return `(() => {
    function findVisualHost(widget) {
      let element = widget.parentElement;
      for (let depth = 0; element && element !== document.body && depth < 9; depth += 1, element = element.parentElement) {
        const rect = element.getBoundingClientRect();
        if (rect.width >= 96 && rect.height >= 80) return element;
      }
      return null;
    }

    function boot() {
      const widgets = new Set();
      document.querySelectorAll('.ce-exact-icon img,.elementor-widget-icon img').forEach((image) => {
        const widget = image.closest('.ce-exact-icon,.elementor-widget-icon');
        if (widget) widgets.add(widget);
      });

      widgets.forEach((widget) => {
        const host = findVisualHost(widget);
        if (!host) return;
        const hasImageBackground = getComputedStyle(host).backgroundImage.includes('url(');
        if (hasImageBackground) {
          widget.classList.add('ce-placeholder-image-hidden');
          widget.setAttribute('aria-hidden', 'true');
          return;
        }
        host.classList.add('ce-placeholder-image-host');
        widget.classList.add('ce-placeholder-image-widget');
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else window.requestAnimationFrame(boot);
  })();`;
}

function buildPapeisFilterScript() {
  return `(() => {
    function normalize(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
    function boot(){
      const container = document.querySelector('.cat-filters');
      if(!container || container.dataset.ceFilterReady==='1') return;
      container.dataset.ceFilterReady='1';
      const pills = Array.from(container.querySelectorAll('a,button'));
      const sections = Array.from(document.querySelectorAll('.cat-section'));
      if(!pills.length || !sections.length) return;
      pills.forEach(p=>{
        p.setAttribute('role','button');
        if(p.tagName==='A' && (p.getAttribute('href')||'').includes('whatsapp')){
          p.dataset.ceHref=p.getAttribute('href');
          p.removeAttribute('href');
          p.style.cursor='pointer';
        }
        p.style.cursor='pointer';
      });
      function setActive(active){
        pills.forEach(p=>{
          const on = p===active;
          p.classList.toggle('active', on);
          // O CSS (.cat-pill.active) destaca o WRAPPER elementor, não o <a>/<button> interno —
          // sem isso o amarelo ficava preso no "Todos" com o conteúdo de outra categoria ("torto").
          const wrap = p.closest('.cat-pill');
          if(wrap) wrap.classList.toggle('active', on);
        });
      }
      function filterFor(label){
        const n=normalize(label);
        if(n.includes('todos')) return sections;
        if(n.includes('pronta')) return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes('pronta'));
        if(n.includes('lanc')) return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes('lanc'));
        if(n.includes('adulto')) return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes('adulto'));
        if(n.includes('infantil')) return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes('infantil'));
        if(n.includes('painel')||n.includes('personalizado')) return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes('painel'));
        return sections.filter(s=>normalize(s.querySelector('.cat-section-name')?.textContent).includes(n));
      }
      function apply(pill){
        const label = pill.textContent || '';
        const matched = filterFor(label);
        const showAll = normalize(label).includes('todos');
        sections.forEach(sec=>{
          const shouldShow = showAll || matched.includes(sec);
          sec.style.display = shouldShow ? '' : 'none';
          sec.hidden = !shouldShow;
        });
        setActive(pill);
        const first = matched[0];
        if(first) first.scrollIntoView({behavior:'smooth', block:'start'});
      }
      pills.forEach(p=>{
        p.addEventListener('click', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          apply(p);
        });
      });
      const initial = pills.find(p=>p.classList.contains('active')) || pills[0];
      if(initial) setActive(initial);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  })();`;
}

function buildCalcFixScript() {
  return `(() => {
    function num(v){ const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return (isFinite(n) && n > 0) ? n : 0; }
    function fmt(n, d){ return Number(n).toFixed(d == null ? 1 : d).replace('.', ','); }
    function setStat(id, text){
      const node = document.getElementById(id);
      if(!node) return;
      const w = node.querySelector('.elementor-widget-container');
      if(w) w.textContent = text;
    }
    function boot(){
      const larg = document.getElementById('form-field-largura') || document.getElementById('largura');
      const alt = document.getElementById('form-field-altura') || document.getElementById('altura');
      const rend = document.getElementById('form-field-rendimento') || document.getElementById('rendimento');
      if(!larg || !alt) return;
      const form = larg.closest('form');
      const simLayout = (larg.closest && larg.closest('.sim-layout')) || document.querySelector('.sim-layout');
      const simVazio = document.getElementById('simVazio');
      const simInline = document.getElementById('simInline');
      // ── Botão: no banco ele está dentro de um field-group display:none → move p/ dentro do form e mostra.
      let btn = document.getElementById('ceCalcBtn');
      if(btn && form && btn.closest('form') !== form) form.appendChild(btn);
      if(!btn && form){
        btn = document.createElement('button');
        btn.id = 'ceCalcBtn'; btn.type = 'button';
        btn.className = 'elementor-button elementor-size-sm';
        btn.textContent = 'Calcular quantidade de rolos';
        form.appendChild(btn);
      }
      if(btn){
        btn.type = 'button';
        const grp = btn.closest ? btn.closest('.elementor-field-group') : null;
        if(grp && form && getComputedStyle(grp).display === 'none') form.appendChild(btn);
        btn.style.display='inline-flex';
        btn.style.visibility='visible';
        btn.style.opacity='1';
        btn.style.pointerEvents='auto';
      }
      // ── Resultado: no banco ele está dentro do form do HERO (topo) → cada tecla rolava a tela p/ cima.
      // Move p/ baixo do form da calculadora e calcula de forma autossuficiente (sem scroll ao digitar).
      let out = document.getElementById('ceCalcResultado');
      if(out && simLayout && !simLayout.contains(out)){
        const host = (form && form.closest('.sim-form')) || (form && form.parentElement) || simLayout;
        if(host && host !== out.parentElement) host.appendChild(out);
      }
      if(!out){
        out = document.createElement('div');
        out.id = 'ceCalcResultado';
        out.style.display = 'none';
        const host = (form && form.closest('.sim-form')) || (form && form.parentElement) || simLayout || document.body;
        if(host) host.appendChild(out);
      }
      let txt = document.getElementById('ceCalcTexto');
      if(!txt){
        txt = out.querySelector('span') || document.createElement('span');
        if(!txt.id) txt.id = 'ceCalcTexto';
        if(!txt.parentElement) out.appendChild(txt);
      }
      function compute(scroll){
        const l = num(larg.value), a = num(alt.value);
        let r = rend ? num(rend.value) : 0;
        if(!r) r = 4.5;
        const ok = l > 0 && a > 0;
        if(!ok){
          if(out){ out.style.display='none'; }
          if(simVazio){ simVazio.hidden=false; simVazio.style.display='block'; }
          if(simInline){ simInline.style.display='none'; }
          return;
        }
        const area = Math.round(l * a * 10) / 10;
        const rolos = Math.ceil(area / r);
        const extra = Math.ceil(area * 1.1 / r);
        if(txt) txt.innerHTML = '<strong>' + rolos + (rolos === 1 ? ' rolo' : ' rolos') + '</strong> para ' + fmt(l, 2) + ' m x ' + fmt(a, 2) + ' m (área de ' + fmt(area, 1) + ' m²).<br>Com margem de 10%: <strong>' + extra + ' rolos</strong>.';
        if(out){ out.hidden=false; out.style.display='block'; }
        setStat('resM2', fmt(area, 1));
        setStat('resRolos', String(rolos));
        setStat('resRolosExtra', String(extra));
        const wa = document.getElementById('simWaLink');
        const waA = wa ? (wa.tagName === 'A' ? wa : wa.querySelector('a')) : null;
        if(waA) waA.href = 'https://api.whatsapp.com/send?phone=5521999886842&text=' + encodeURIComponent('Olá! Calculei que preciso de ' + extra + ' rolos para uma parede de ' + fmt(area, 1) + 'm². Quero um orçamento!');
        if(simVazio){ simVazio.style.display='none'; }
        if(simInline){ simInline.hidden=false; simInline.style.display='flex'; }
        if(scroll && out && out.scrollIntoView){ try{ out.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){} }
      }
      [larg, alt, rend].forEach((el)=>{
        if(!el) return;
        el.addEventListener('input', ()=>compute(false));
        el.addEventListener('change', ()=>compute(false));
      });
      if(btn) btn.addEventListener('click', (e)=>{ e.preventDefault(); compute(true); });
      if(form) form.addEventListener('submit', (e)=>{ e.preventDefault(); compute(true); });
      compute(false);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  })();`;
}

function buildAlbumClickScript() {
  return `(() => {
    function boot(){
      const cards = document.querySelectorAll('.album-card');
      if(!cards.length) return;
      cards.forEach(card=>{
        if(card.dataset.ceAlbumClick==='1') return;
        card.dataset.ceAlbumClick='1';
        const link = card.querySelector('a.album-btn[href], a[href*="/album-"], a[href*="/categoria-produto"]');
        if(!link) return;
        const href = link.getAttribute('href');
        if(!href || href.includes('whatsapp')) return;
        card.style.cursor='pointer';
        card.addEventListener('click', (e)=>{
          if(e.target.closest('a,button')) return;
          window.location.href = href;
        });
      });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  })();`;
}

function buildFaqToggleScript() {
  return `(() => {
    function boot(){
      document.querySelectorAll('.elementor-toggle').forEach((toggle)=>{
        if(toggle.dataset.ceFaqReady==='1') return;
        toggle.dataset.ceFaqReady='1';
        const titles = Array.from(toggle.querySelectorAll('.elementor-tab-title'));
        titles.forEach((title)=>{
          title.classList.remove('elementor-active');
          title.setAttribute('aria-expanded','false');
          if(!title.hasAttribute('tabindex')) title.setAttribute('tabindex','0');
          title.addEventListener('click', (e)=>{
            e.preventDefault();
            const isOpen = title.classList.contains('elementor-active');
            titles.forEach((other)=>{
              other.classList.remove('elementor-active');
              other.setAttribute('aria-expanded','false');
            });
            if(!isOpen){
              title.classList.add('elementor-active');
              title.setAttribute('aria-expanded','true');
            }
          });
          title.addEventListener('keydown', (e)=>{
            if(e.key==='Enter'||e.key===' '){ e.preventDefault(); title.click(); }
          });
        });
      });
      document.querySelectorAll('.faq-item').forEach((item)=>{
        const btn = item.querySelector('.faq-q');
        if(!btn || btn.dataset.ceFaqReady==='1') return;
        btn.dataset.ceFaqReady='1';
        item.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
        btn.addEventListener('click', (e)=>{
          e.preventDefault();
          const wasOpen = item.classList.contains('open');
          document.querySelectorAll('.faq-item.open').forEach((other)=>{
            other.classList.remove('open');
            const q = other.querySelector('.faq-q');
            if(q) q.setAttribute('aria-expanded','false');
          });
          if(!wasOpen){ item.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
        });
      });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  })();`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
