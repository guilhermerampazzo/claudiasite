import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCatalogStats, listCatalogCategories, listCatalogProducts } from "@/lib/catalog";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const search = new URL(request.url).searchParams;
  const type = search.get("type") || "stats";
  if (type === "categories") return NextResponse.json({ categories: await listCatalogCategories({ query: search.get("q") || "", limit: 500 }) });
  if (type === "products") return NextResponse.json(await listCatalogProducts({ query: search.get("q") || "", page: Number(search.get("page")) || 1, perPage: 40 }));
  return NextResponse.json(await getCatalogStats());
}
