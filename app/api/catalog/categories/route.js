import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCatalogCategory } from "@/lib/catalog";

export async function POST(request) {
  const denied = requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (!String(body.name || "").trim()) return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
  return NextResponse.json({ category: await createCatalogCategory(body) }, { status: 201 });
}
