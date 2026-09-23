#!/usr/bin/env node
/*
 * Monta uma capa MOBILE (retrato1024x1536) a partir da capa DESKTOP (1600x900).
 *
 * Motivo: Pisos é a única página sem capa retrato em capasnovass/celular/.
 * Com a capa16:9 no hero retrato, o `cover` ou corta o título (janela de667px
 * contra~765px de texto) ou deixa os botões por cima do subtítulo — não dá
 * para ter as DUAS coisas em360-430px (medido).
 *
 * Montagem: fundo = mesma foto em cover + blur; em cima, a faixa CENTRAL da
 * capa (1024x900 — contém o texto inteiro com margem) deslocada para cima,
 * deixando espaço livre embaixo para os botões HTML.
 *
 * Uso: node scripts/monta-capa-mobile.mjs <capa-desktop.jpg> <saida.jpg>
 */
import sharp from "sharp";

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error("uso: node scripts/monta-capa-mobile.mjs <capa-desktop1600x900.jpg> <saida1024x1536.jpg>");
  process.exit(1);
}

const L = 1024, A = 1536;      // saída retrato (mesma proporção das outras capas mobile)
const FAIXA_A = 900;           // altura da faixa central (== altura da capa desktop)
const FAIXA_Y = 300;           // onde ela entra (deixa300 em cima e236 embaixo)

const meta = await sharp(entrada).metadata();
const cx = Math.round((meta.width - L) / 2);

const fundo = await sharp(entrada)
  .resize(L, A, { fit: "cover", position: "attention" })
  .blur(46)
  .composite([{ input: { create: { width: L, height: A, channels: 4, background: { r: 14, g: 12, b: 8, alpha: 0.45 } } } }])
  .png()
  .toBuffer();

const faixa = await sharp(entrada)
  .extract({ left: cx, top: 0, width: L, height: FAIXA_A })
  .png()
  .toBuffer();

await sharp(fundo)
  .composite([{ input: faixa, left: 0, top: FAIXA_Y }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(saida);

const out = await sharp(saida).metadata();
console.log(`ok: ${saida} (${out.width}x${out.height}) — faixa x=${cx}..${cx + L} em y=${FAIXA_Y} (texto da capa está dentro da faixa)`);
