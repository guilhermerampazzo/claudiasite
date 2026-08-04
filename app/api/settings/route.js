import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildGlobalCss, dbQuery, getSettings } from "@/lib/db";
import { mergeSiteSettings } from "@/lib/site-settings";

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const settings = await getSettings();
  return NextResponse.json({ settings, preview_css: buildGlobalCss(settings) });
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
  settings.social = {
    instagram: String(settings.social?.instagram || "").trim().slice(0, 500),
    facebook: String(settings.social?.facebook || "").trim().slice(0, 500),
    pinterest: String(settings.social?.pinterest || "").trim().slice(0, 500)
  };
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('global', $1::jsonb, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(settings)]
  );
  return NextResponse.json({ settings });
}
