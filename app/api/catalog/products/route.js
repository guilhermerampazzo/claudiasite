import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCatalogProduct } from "@/lib/catalog";

export async function POST(request) {
  const denied = requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (!String(body.name || "").trim()) return NextResponse.json({ error: "Informe o nome do produto." }, { status: 400 });
  return NextResponse.json({ product: await createCatalogProduct(body) }, { status: 201 });
}
