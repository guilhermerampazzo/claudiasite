import { getCatalogMedia } from "@/lib/catalog";

export async function GET(_request, { params }) {
  const { kind, id } = await params;
  if (!['categoria','produto','miniatura'].includes(kind) || !/^-?\d+$/.test(id)) return new Response("Imagem inválida.", { status: 400 });
  const media = await getCatalogMedia(kind, Number(id));
  if (!media) return new Response("Imagem não encontrada.", { status: 404 });
  return new Response(media.buffer, { headers: { "content-type": media.contentType, "cache-control": "public, max-age=31536000, immutable" } });
}
