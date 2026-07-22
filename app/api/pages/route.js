import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPage, listPages } from "@/lib/db";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ pages: await listPages() });
}

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const slug = normalizeSlug(body.slug || title);
  const templateSlug = String(body.templateSlug || "amorim");
  if (!title || !slug) {
    return NextResponse.json({ error: "Informe titulo e endereco da pagina." }, { status: 400 });
  }
  const page = await createPage({ title, slug, templateSlug });
  if (!page) {
    return NextResponse.json({ error: "Endereco em uso ou modelo invalido." }, { status: 409 });
  }
  return NextResponse.json({ page }, { status: 201 });
}

function normalizeSlug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
