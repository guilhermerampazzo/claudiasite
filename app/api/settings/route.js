import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dbQuery, getSettings } from "@/lib/db";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const settings = await request.json();
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('global', $1::jsonb, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(settings)]
  );
  return NextResponse.json({ settings });
}
