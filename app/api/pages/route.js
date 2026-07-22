import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPages } from "@/lib/db";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ pages: await listPages() });
}
