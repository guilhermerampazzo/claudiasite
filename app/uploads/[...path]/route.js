import fs from "node:fs/promises";
import path from "node:path";

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

export async function GET(request, { params }) {
  const { path: parts } = await params;
  const requested = path.resolve(uploadRoot, ...parts);
  const root = path.resolve(uploadRoot);
  if (!requested.startsWith(root)) {
    return new Response("Arquivo invalido.", { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(requested);
    if (!stat.isFile()) return new Response("Arquivo nao encontrado.", { status: 404 });
  } catch {
    return new Response("Arquivo nao encontrado.", { status: 404 });
  }

  const total = stat.size;
  const type = MIME[path.extname(requested).toLowerCase()] || "application/octet-stream";
  const baseHeaders = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable"
  };

  // Safari/iOS exige 206 Partial Content para tocar video inline
  const range = request.headers.get("range");
  const match = range ? range.match(/bytes=(\d*)-(\d*)/) : null;
  if (match && (match[1] !== "" || match[2] !== "")) {
    let start = match[1] === "" ? null : Number.parseInt(match[1], 10);
    let end = match[2] === "" ? null : Number.parseInt(match[2], 10);
    if (start === null && end !== null) {
      start = Math.max(0, total - end);
      end = total - 1;
    }
    if (start === null) start = 0;
    if (end === null || end >= total) end = total - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    }
    const length = end - start + 1;
    const handle = await fs.open(requested, "r");
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      return new Response(buffer, {
        status: 206,
        headers: {
          ...baseHeaders,
          "content-length": String(length),
          "content-range": `bytes ${start}-${end}/${total}`
        }
      });
    } finally {
      await handle.close();
    }
  }

  return new Response(await fs.readFile(requested), {
    headers: { ...baseHeaders, "content-length": String(total) }
  });
}
