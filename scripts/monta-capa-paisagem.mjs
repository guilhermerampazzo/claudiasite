#!/usr/bin/env node
/*
 * Compõe uma capa PAISAGEM (1600x900) a partir de uma capa RETRATO (1024x1536).
 *
 * Motivo: Papéis de Parede e Persianas não receberam capa paisagem da arte
 * (capasnovass/computador/ só tem5) — as páginas ficavam usando o arquivo
 * retrato no desktop e o `background-size:cover` escalava2~3x, cortando o
 * título pintado ("a imagem não está encaixando, fica muito grande").
 *
 * Composição: fundo = mesma foto em cover + blur + escurecido; em cima, a capa
 * inteira ajustada pela ALTURA (então nada do design é cortado e o texto
 * renderiza na proporção certa).
 *
 * Uso:  node scripts/monta-capa-paisagem.mjs <entrada.jpg> <saida.jpg>
 */
import fs from "node:fs/promises";
import sharp from "sharp";

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error("uso: node scripts/monta-capa-paisagem.mjs <entrada.jpg> <saida.jpg>");
  process.exit(1);
}

const W = 1600;
const H = 900;
const buf = await fs.readFile(entrada);
const meta = await sharp(buf).metadata();

// 1) fundo: cover + blur + véu escuro
const fundo = await sharp(buf)
  .resize(W, H, { fit: "cover", position: "attention" })
  .blur(48)
  .composite([
    {
      input: { create: { width: W, height: H, channels: 4, background: { r: 12, g: 10, b: 6, alpha: 0.5 } } },
    },
  ])
  .png()
  .toBuffer();

// 2) frente: capa inteira, ajustada pela altura (nada é cortado)
const fgH = H;
const fgW = Math.round((H * meta.width) / meta.height);
const frente = await sharp(buf).resize(fgW, fgH, { fit: "fill" }).png().toBuffer();

await sharp(fundo)
  .composite([{ input: frente, left: Math.round((W - fgW) / 2), top: 0 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(saida);

const out = await sharp(saida).metadata();
console.log(`ok: ${saida} (${out.width}x${out.height}) — origem ${meta.width}x${meta.height} -> painel ${fgW}x${fgH}`);
