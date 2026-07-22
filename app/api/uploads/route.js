import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dbQuery } from "@/lib/db";

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const folder = path.join(uploadRoot, stamp);
  await fs.mkdir(folder, { recursive: true });
  const filename = `${Date.now()}-${safeName}`;
  const diskPath = path.join(folder, filename);
  await fs.writeFile(diskPath, buffer);

  const publicPath = `/uploads/${stamp}/${filename}`;
  await dbQuery(
    "INSERT INTO uploads (filename, public_path, mime_type, size_bytes) VALUES ($1, $2, $3, $4)",
    [file.name, publicPath, file.type || "application/octet-stream", buffer.length]
  );

  return NextResponse.json({ path: publicPath });
}
