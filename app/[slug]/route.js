import { getGlobalParts, getPageBySlug, getSettings, renderHtml } from "@/lib/db";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const [page, settings, globalParts] = await Promise.all([
    getPageBySlug(slug),
    getSettings(),
    getGlobalParts()
  ]);

  if (!page || page.page_type !== "page") {
    return new Response("Pagina nao encontrada.", { status: 404 });
  }

  return new Response(renderHtml(page.html, settings, globalParts), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
