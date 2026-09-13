import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";
import { getPageSeoDescription } from "@/lib/seo";

export async function GET() {
  const [page, settings, globalHeaderHtml] = await Promise.all([
    getHomePage(),
    getSettings(),
    getHomeHeaderHtml(),
  ]);
  // Home sem a seção de catálogo ("Coleções para todos os ambientes") —
  // removida a pedido da cliente; demais páginas mantêm sua injeção própria.
  const html = page.html;
  return new Response(renderHtml(html, settings, { globalHeaderHtml, seo: { path: "/", title: page.title, description: getPageSeoDescription(page.slug) } }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
