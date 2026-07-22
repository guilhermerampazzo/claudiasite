import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dbQuery } from "@/lib/db";

export async function POST(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { slug } = await params;
  const result = await dbQuery(
    `UPDATE pages
     SET html = original_html, updated_at = now()
     WHERE slug = $1
     RETURNING slug, title, html, original_html, is_home, updated_at`,
    [slug]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: "Pagina nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ page: result.rows[0] });
}
