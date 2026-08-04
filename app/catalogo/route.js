import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { listCatalogCategories } from "@/lib/catalog";
import { buildCatalogDocument, renderCatalogIndex } from "@/lib/catalog-html";

export async function GET() {
  const [home, settings, globalHeaderHtml, categories] = await Promise.all([getHomePage(), getSettings(), getHomeHeaderHtml(), listCatalogCategories({ limit: 500 })]);
  const html = buildCatalogDocument({ homeHtml: home.html, title: "Catálogo", content: renderCatalogIndex(categories) });
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: "/catalogo", title: "Catálogo - Casa Estampa Interiores", description: "Catálogo completo Casa Estampa: papéis de parede, cortinas, persianas e pisos organizados por coleção." } }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
