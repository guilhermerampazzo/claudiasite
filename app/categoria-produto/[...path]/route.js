import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getCategoryByPath, listCategoryChildren, listCatalogProducts } from "@/lib/catalog";
import { buildCatalogDocument, renderCategoryPage } from "@/lib/catalog-html";

export async function GET(request, { params }) {
  const { path } = await params;
  const categoryPath = path.join("/");
  const category = await getCategoryByPath(categoryPath);
  if (!category) return new Response("Categoria não encontrada.", { status: 404 });
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("pagina")) || 1);
  const [home, settings, globalHeaderHtml, children, listing] = await Promise.all([getHomePage(), getSettings(), getHomeHeaderHtml(), listCategoryChildren(category.source_id), listCatalogProducts({ categoryId: category.source_id, page })]);
  const html = buildCatalogDocument({ homeHtml: home.html, title: category.name, content: renderCategoryPage({ category, children, listing }) });
  return new Response(renderHtml(html, settings, { globalHeaderHtml }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
