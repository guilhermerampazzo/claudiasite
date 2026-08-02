import { getHomeHeaderHtml, getPageBySlug, getSettings, renderHtml } from "@/lib/db";
import { getCatalogSectionCategories } from "@/lib/catalog";
import { injectCatalogSection, renderCatalogSection } from "@/lib/catalog-html";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || page.page_type !== "page") {
    return new Response("Pagina nao encontrada.", { status: 404 });
  }

  const [settings, globalHeaderHtml, catalogCategories] = await Promise.all([
    getSettings(),
    getHomeHeaderHtml(),
    getCatalogSectionCategories(page.slug)
  ]);

  const catalogSection = renderCatalogSection(catalogCategories, { title: slug === "papeis-de-parede" ? "Álbuns e coleções" : "Conheça nossas linhas", limit: 16 });
  const html = injectCatalogSection(page.html, catalogSection);
  return new Response(renderHtml(html, settings, { globalHeaderHtml }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
