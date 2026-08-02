import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateCatalogProduct } from "@/lib/catalog";

export async function PATCH(request, { params }) {
  const denied = requireAdmin(request); if (denied) return denied;
  const { id } = await params;
  const product = await updateCatalogProduct(Number(id), await request.json().catch(() => ({})));
  return product ? NextResponse.json({ product }) : NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
}
