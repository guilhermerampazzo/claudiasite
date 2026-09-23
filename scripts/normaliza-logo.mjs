/*
 * Cria as versões aparadas (norm/) que faltam para a home.
 * Fontes são PNGs360x360 com margens transparentes grandes => na grade elas
 * pareciam de tamanhos diferentes. Recorta pelo bounding box do alfa.
 *   node scripts/normaliza-logo.mjs <entrada.png> <saida.png>
 */
import sharp from "sharp";

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error("uso: node scripts/normaliza-logo.mjs <entrada.png> <saida.png>");
  process.exit(1);
}

const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] > 12) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) { console.error("sem pixels visiveis:", entrada); process.exit(1); }
const w = maxX - minX + 1, h = maxY - minY + 1;
await sharp(entrada).ensureAlpha().extract({ left: minX, top: minY, width: w, height: h }).png().toFile(saida);
const m = await sharp(saida).metadata();
console.log(`ok: ${saida} ${width}x${height} -> ${m.width}x${m.height} (corte ${minX},${minY})`);
