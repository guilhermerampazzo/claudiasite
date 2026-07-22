import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dbQuery, getPageBySlug } from "@/lib/db";

export async function GET(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return NextResponse.json({ error: "Pagina nao encontrada." }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PUT(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { slug } = await params;
  const body = await request.json();
  if (!body.html || typeof body.html !== "string") {
    return NextResponse.json({ error: "HTML invalido." }, { status: 400 });
  }

  const result = await dbQuery(
    `UPDATE pages
     SET html = $1, title = COALESCE($2, title), updated_at = now()
     WHERE slug = $3
     RETURNING slug, title, html, original_html, is_home, page_type, updated_at`,
    [body.html, body.title || null, slug]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: "Pagina nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ page: result.rows[0] });
}
