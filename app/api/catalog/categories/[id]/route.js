import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateCatalogCategory } from "@/lib/catalog";

export async function PATCH(request, { params }) {
  const denied = requireAdmin(request); if (denied) return denied;
  const { id } = await params;
  const category = await updateCatalogCategory(Number(id), await request.json().catch(() => ({})));
  return category ? NextResponse.json({ category }) : NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
}
