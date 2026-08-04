import { NextResponse } from "next/server";
import { listCatalogCategories, listCatalogProducts } from "@/lib/catalog";

export async function GET(request) {
  const search = new URL(request.url).searchParams;
  const query = (search.get("q") || "").trim().slice(0, 120);
  if (!query) return NextResponse.json({ query, categories: [], products: [] });
  const [categories, listing] = await Promise.all([
    listCatalogCategories({ query, limit: 12 }),
    listCatalogProducts({ query, page: 1, perPage: 24 })
  ]);
  return NextResponse.json({ query, categories, products: listing.products, total: listing.total });
}
