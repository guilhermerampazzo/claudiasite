import { getGlobalParts, getHomePage, getSettings, renderHtml } from "@/lib/db";

export async function GET() {
  const [page, settings, globalParts] = await Promise.all([
    getHomePage(),
    getSettings(),
    getGlobalParts()
  ]);
  return new Response(renderHtml(page.html, settings, globalParts), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
