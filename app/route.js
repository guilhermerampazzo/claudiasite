import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getCatalogSectionCategories } from "@/lib/catalog";
import { injectCatalogSection, renderCatalogSection } from "@/lib/catalog-html";
import { getPageSeoDescription } from "@/lib/seo";

export async function GET() {
  const [page, settings, globalHeaderHtml, catalogCategories] = await Promise.all([
    getHomePage(),
    getSettings(),
    getHomeHeaderHtml(),
    getCatalogSectionCategories("home")
  ]);
  const catalogSection = renderCatalogSection(catalogCategories, { title: "Coleções para todos os ambientes", limit: 8 });
  const html = injectCatalogSection(page.html, catalogSection);
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: "/", title: page.title, description: getPageSeoDescription(page.slug) } }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
