import fs from "node:fs/promises";
import path from "node:path";

export const SOURCE_PAGES = [
  {
    slug: "amorim",
    title: "Amorim",
    file: "amorim.html",
    home: true
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
  }
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
