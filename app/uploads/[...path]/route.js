import fs from "node:fs/promises";
import path from "node:path";

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function GET(_request, { params }) {
  const { path: parts } = await params;
  const requested = path.resolve(uploadRoot, ...parts);
  const root = path.resolve(uploadRoot);
  if (!requested.startsWith(root)) {
    return new Response("Arquivo invalido.", { status: 400 });
  }
  try {
    const file = await fs.readFile(requested);
    return new Response(file, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response("Arquivo nao encontrado.", { status: 404 });
  }
}
