import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncCatalog } from "@/lib/catalog";

export const maxDuration = 300;

export async function POST(request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try { return NextResponse.json(await syncCatalog()); }
  catch (error) { return NextResponse.json({ error: String(error.message || error) }, { status: 500 }); }
}
