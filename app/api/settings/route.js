import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dbQuery, getSettings } from "@/lib/db";
import { mergeSiteSettings } from "@/lib/site-settings";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const settings = mergeSiteSettings(body);
  settings.menu = settings.menu.slice(0, 12).map((item) => ({
    label: String(item?.label || "").trim().slice(0, 60),
    href: String(item?.href || "").trim().slice(0, 500)
  })).filter((item) => item.label && item.href);
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('global', $1::jsonb, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(settings)]
  );
  return NextResponse.json({ settings });
}
