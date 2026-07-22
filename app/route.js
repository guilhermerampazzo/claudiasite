import { getHomePage, getSettings, renderHtml } from "@/lib/db";

export async function GET() {
  const [page, settings] = await Promise.all([getHomePage(), getSettings()]);
  return new Response(renderHtml(page.html, settings), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
