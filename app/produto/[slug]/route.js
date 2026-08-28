import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getCatalogProduct, getCategoryByPath, listCatalogProducts } from "@/lib/catalog";
import { buildCatalogDocument, renderProductPage } from "@/lib/catalog-html";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return new Response("Produto não encontrado.", { status: 404 });
  const categories = product.categories || [];
  const primary = categories.slice().sort((a, b) => b.path.split("/").length - a.path.split("/").length)[0] || null;
  let prev = null;
  let next = null;
  if (primary) {
    const category = await getCategoryByPath(primary.path);
    if (category) {
      const listing = await listCatalogProducts({ categoryId: category.source_id, perPage: 100000 });
      const index = listing.products.findIndex((item) => item.slug === slug);
      if (index >= 0) {
        const previous = listing.products[index - 1];
        const following = listing.products[index + 1];
        prev = previous ? { slug: previous.slug, name: previous.name } : null;
        next = following ? { slug: following.slug, name: following.name } : null;
      }
    }
  }
  const [home, settings, globalHeaderHtml] = await Promise.all([getHomePage(), getSettings(), getHomeHeaderHtml()]);
  const html = buildCatalogDocument({ homeHtml: home.html, title: product.name, content: renderProductPage(product, { prev, next }) });
  const description = (product.short_description || product.description || `${product.name} disponível na Casa Estampa Interiores. Consulte disponibilidade, medição e instalação.`).slice(0, 300);
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: `/produto/${slug}`, title: `${product.name} - Casa Estampa`, description, image: product.images?.[0]?.src } }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
