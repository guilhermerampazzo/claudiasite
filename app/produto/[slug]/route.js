import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getCatalogProduct } from "@/lib/catalog";
import { buildCatalogDocument, renderProductPage } from "@/lib/catalog-html";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return new Response("Produto não encontrado.", { status: 404 });
  const [home, settings, globalHeaderHtml] = await Promise.all([getHomePage(), getSettings(), getHomeHeaderHtml()]);
  const html = buildCatalogDocument({ homeHtml: home.html, title: product.name, content: renderProductPage(product) });
  const description = (product.short_description || product.description || `${product.name} disponível na Casa Estampa Interiores. Consulte disponibilidade, medição e instalação.`).slice(0, 300);
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: `/produto/${slug}`, title: `${product.name} - Casa Estampa`, description, image: product.images?.[0]?.src } }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
