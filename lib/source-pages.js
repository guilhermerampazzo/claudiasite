import fs from "node:fs/promises";
import path from "node:path";

export const SOURCE_PAGES = [
  {
    slug: "home",
    title: "Home",
    file: "home.html",
    home: true
  },
  {
    slug: "amorim",
    title: "Amorim",
    file: "amorim.html",
  },
  {
    slug: "amorim-tela-solar",
    title: "Tela Solar",
    file: "amorim-tela-solar.html"
  },
  {
    slug: "arquitetos-designers",
    title: "Arquitetos & Designers",
    file: "arquitetos-designers.html"
  },
  {
    slug: "corporativo",
    title: "Corporativo",
    file: "corporativo.html"
  },
  {
    slug: "cortinas",
    title: "Cortinas",
    file: "cortinas.html"
  },
  {
    slug: "papeis-de-parede",
    title: "Papeis de Parede",
    file: "papeis-de-parede.html"
  },
  {
    slug: "persianas",
    title: "Persianas",
    file: "persianas.html"
  },
  {
    slug: "pisos",
    title: "Pisos",
    file: "pisos.html"
  }
];

export const GLOBAL_PARTS = [
  { slug: "global-header", title: "Header global", type: "global_header", tag: "nav", className: "navbar" },
  { slug: "global-menu", title: "Menu global", type: "global_menu", tag: "ul", className: "navbar-nav" },
  { slug: "global-footer", title: "Footer global", type: "global_footer", tag: "footer", className: "footer" }
];

const sourceDir = path.join(process.cwd(), "content", "original");
const logoUrl =
  "https://casaestampa.com/wp-content/uploads/2022/09/Logo-Original-Fundo-Transparente.png";

export async function readSourcePage(page) {
  const html = await fs.readFile(path.join(sourceDir, page.file), "utf8");
  return normalizeSourceHtml(html);
}

export function normalizeSourceHtml(html) {
  return html.replaceAll(logoUrl, "/assets/logo-letra.svg");
}

export function buildGlobalPartDocument(sourceHtml, part) {
  const head = sourceHtml.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] || "<head></head>";
  const fragment = extractGlobalPart(sourceHtml, part) || `<${part.tag} class="${part.className}"></${part.tag}>`;
  return `<!DOCTYPE html>\n<html lang="pt-BR">\n${head}\n<body>${fragment}</body>\n</html>`;
}

export function extractGlobalPart(html, part) {
  return html.match(globalPartPattern(part))?.[0] || "";
}

export function replaceGlobalPart(html, part, replacementDocument) {
  const replacement = extractGlobalPart(replacementDocument, part);
  if (!replacement || !globalPartPattern(part).test(html)) return html;
  return html.replace(globalPartPattern(part), replacement);
}

function globalPartPattern(part) {
  const className = part.className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<${part.tag}\\b(?=[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/${part.tag}>`,
    "i"
  );
}
