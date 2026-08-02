import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getCatalogProduct } from "@/lib/catalog";
import { buildCatalogDocument, renderProductPage } from "@/lib/catalog-html";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return new Response("Produto não encontrado.", { status: 404 });
  const [home, settings, globalHeaderHtml] = await Promise.all([getHomePage(), getSettings(), getHomeHeaderHtml()]);
  const html = buildCatalogDocument({ homeHtml: home.html, title: product.name, content: renderProductPage(product) });
  return new Response(renderHtml(html, settings, { globalHeaderHtml }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
