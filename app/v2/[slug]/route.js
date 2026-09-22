import fs from "node:fs/promises";
import path from "node:path";

/*
 * Preview/publicação das páginas "congeladas" (v2).
 * Recompoe o HTML exato: head + seções editadas + tail. Como as seções são
 * o markup original (e o CSS/JS originais seguem no head/tail), o resultado
 * é idêntico ao site no ar — fidelidade por construção.
 */

const PAGES_DIR = path.join(process.cwd(), "public", "puck", "pages");

export async function GET(_request, { params }) {
  const { slug } = await params;
  const base = path.join(PAGES_DIR, slug);
  if (!base.startsWith(PAGES_DIR)) return new Response("Invalido.", { status: 400 });
  try {
    const [head, raw, tail] = await Promise.all([
      fs.readFile(`${base}.head.html`, "utf8"),
      fs.readFile(`${base}.json`, "utf8"),
      fs.readFile(`${base}.tail.html`, "utf8"),
    ]);
    const data = JSON.parse(raw);
    const body = (data.content || []).map((block) => block.props?.html || "").join("");
    return new Response(head + body + tail, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return new Response("Pagina nao encontrada.", { status: 404 });
  }
}
