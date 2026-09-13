import { getHomeHeaderHtml, getPageBySlug, getSettings, renderHtml } from "@/lib/db";
import { getCatalogSectionCategories } from "@/lib/catalog";
import { injectCatalogSection, renderCatalogSection } from "@/lib/catalog-html";
import { getPageSeoDescription } from "@/lib/seo";

const REDIRECTS = {
  "area-do-arquiteto": "arquitetos-designers"
};

export async function GET(_request, { params }) {
  const { slug } = await params;
  if (REDIRECTS[slug]) {
    return new Response(null, { status: 302, headers: { location: `/${REDIRECTS[slug]}` } });
  }
  const page = await getPageBySlug(slug);

  if (!page || page.page_type !== "page") {
    return new Response("Pagina nao encontrada.", { status: 404 });
  }

  const [settings, globalHeaderHtml] = await Promise.all([
    getSettings(),
    getHomeHeaderHtml(),
  ]);

  // Papéis de Parede não exibe mais a seção de catálogo ("Álbuns e coleções",
  // removida a pedido da cliente); demais páginas mantêm sua injeção própria.
  let html = page.html;
  if (slug !== "papeis-de-parede") {
    const catalogCategories = await getCatalogSectionCategories(page.slug);
    const catalogSection = renderCatalogSection(catalogCategories, { title: slug === "pisos" ? "Marcas e coleções" : "Conheça nossas linhas", limit: 16 });
    html = injectCatalogSection(page.html, catalogSection);
  }
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: `/${slug}`, title: page.title, description: getPageSeoDescription(slug) } }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
