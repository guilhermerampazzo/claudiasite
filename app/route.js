import { getHomeHeaderHtml, getHomePage, getSettings, renderHtml } from "@/lib/db";

export async function GET() {
  const [page, settings, globalHeaderHtml] = await Promise.all([
    getHomePage(),
    getSettings(),
    getHomeHeaderHtml()
  ]);
  return new Response(renderHtml(page.html, settings, { globalHeaderHtml }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
