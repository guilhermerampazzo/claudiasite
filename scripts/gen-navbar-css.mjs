import fs from "node:fs";

const REPO = process.cwd() + "/";
const globalCss = fs.readFileSync(REPO + "public/puck/global.css", "utf8");

// parser simples de CSS (regras e @media)
function parse(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@media", i);
    const fim = at === -1 ? css.length : at;
    const chunk = css.slice(i, fim);
    for (const m of chunk.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ media: null, sel: m[1].replace(/\s+/g, " ").trim(), body: m[2].trim() });
    }
    if (at === -1) break;
    const b = css.indexOf("{", at);
    let depth = 1, j = b + 1;
    while (j < css.length && depth) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const media = css.slice(at + 6, b).trim();
    const inner = css.slice(b + 1, j - 1);
    for (const m of inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ media, sel: m[1].replace(/\s+/g, " ").trim(), body: m[2].trim() });
    }
    i = j;
  }
  return rules;
}

const regras = parse(globalCss);
const navbarRules = regras.filter((r) => /\bnavbar\b|\bsite-logo\b|\blogo-symbol\b/.test(r.sel));

console.log("regras do global.css com navbar/site-logo:", navbarRules.length);
const tem190 = navbarRules.filter((r) => /height:\s*190px/.test(r.body)).length;
const tem130 = navbarRules.filter((r) => /height:\s*130px/.test(r.body)).length;
console.log("  com height:190px =", tem190, "| com height:130px =", tem130, "(130 vem DEPOIS => vence)");

// monta navbar.css mantendo a ORDEM original (o bloco de 130px é o último, como na home)
const cabecalho = `/* ═══════════════════════════════════════════════════════════════
   CABEÇALHO ÚNICO Casa Estampa — visual da home em TODAS as páginas.
   Gerado de public/puck/global.css (estrutura/grade) + public/puck/blocks.css
   (cores do botão/menu da home).
   Regra: este arquivo tem que ser carregado POR ÚLTIMO em cada página
   (v2-home/v2-pisos, páginas congeladas via *.head.html e páginas do banco
   via renderHtml), senão o CSS local da página volta a divergir.
   ═══════════════════════════════════════════════════════════════ */
`;

let out = cabecalho;
let lastMedia = "\u0000";
for (const r of navbarRules) {
  if (r.media !== lastMedia) {
    out += r.media ? `\n@media${r.media.startsWith("(") ? r.media : "(" + r.media + ")"} {\n` : "\n/* base (desktop) */\n";
    if (r.media !== lastMedia && lastMedia !== "\u0000" && !r.media) out += "";
    lastMedia = r.media;
  }
  out += `  ${r.sel} { ${r.body} }\n`;
  // fecha/abre media conforme a próxima regra (só fecha se um @media estiver aberto)
  const idx = navbarRules.indexOf(r);
  const prox = navbarRules[idx + 1];
  if (r.media && (!prox || prox.media !== r.media)) out += "}\n";
}

out += `
/* ── Cores do botão e do menu, iguais à home (blocks.css) ─────────────── */
body .navbar .navbar-cta {
  color: #1c1810 !important; background: #c2a57a !important;
  font-family: 'Montserrat', Arial, sans-serif !important; font-size: 10px !important;
  letter-spacing: 2px !important; text-transform: uppercase !important;
  font-weight: 600 !important; text-decoration: none !important; border-bottom: none !important;
  box-shadow: none !important; background-image: none !important;
}
body .navbar .navbar-cta:hover { background: #c8960c !important; color: #1c1810 !important; }
body .navbar .navbar-nav a {
  color: #b8a88a !important; font-family: 'Montserrat', Arial, sans-serif !important;
  font-size: 11px !important; letter-spacing: 2px !important;
  text-transform: uppercase !important; text-decoration: none !important;
}
body .navbar .navbar-nav a:hover, body .navbar .navbar-nav a.active { color: #c2a57a !important; }
body .navbar { background: rgba(28,24,16,.92) !important; border-bottom: 1px solid rgba(194,165,122,.25) !important; }
/* A home não tem busca nem barra social no topo: esconde em qualquer página. */
body .navbar .navbar-search, body .navbar .navbar-social { display: none !important; }
/* Menu: itens na horizontal no desktop, encostados na coluna do mobile
   (algumas páginas congeladas trazem gap:16px e abriam o menu mais alto). */
body .navbar .navbar-nav { gap: clamp(12px, 1.6vw, 26px) !important; }
@media (max-width: 1024px) {
  body .navbar .navbar-nav { gap: 0 !important; }
}

/* ═══════════════════════════════════════════════════════════════════════
   BLINDAGEM — o mesmo bloco acima com especificidade MAIOR.
   Motivo: páginas congeladas trazem regras escopadas que vencem as gerais,
   ex.: body.elementor-page-26152 .navbar-logo img { width:auto !important }
   (o ícone do logo do Papéis ia para 58px contra os 48px da home).
   Aqui os seletores ganham um nível (.navbar como ancestral / corpo), então
   só perdem se a página tiver ainda MAIS classes — e, em empate, este
   arquivo (carregado por último) decide.
   ═══════════════════════════════════════════════════════════════════════ */
`;

// transforma um seletor para ter mais especificidade mantendo o MESMO alvo
function blindar(sel) {
  const alt = sel.split(",").map((s) => {
    let a = s.trim();
    if (a === ".navbar") return "body .navbar.navbar";
    if (a.startsWith(".navbar ")) return "body .navbar.navbar " + a.slice(".navbar ".length);
    if (a.startsWith(".navbar") || a.startsWith("body .navbar")) {
      if (a.startsWith("body .navbar")) return a;
      return "body .navbar " + a; // .navbar-cta, .navbar-logo .site-logo-icon, …
    }
    if (a.startsWith("body ")) return a;
    return a; // seletores sem navbar ficam como estão
  });
  return alt.join(", ");
}

let lastMediaB = "\u0000";
for (const r of navbarRules) {
  if (r.media !== lastMediaB) {
    out += r.media ? `\n@media${r.media.startsWith("(") ? r.media : "(" + r.media + ")"} {\n` : "\n/* blindagem — base (desktop) */\n";
    lastMediaB = r.media;
  }
  out += `  ${blindar(r.sel)} { ${r.body} }\n`;
  const idx = navbarRules.indexOf(r);
  const prox = navbarRules[idx + 1];
  if (r.media && (!prox || prox.media !== r.media)) out += "}\n";
}

out += `
/* Altura do header e o espaço no topo do body, casados (navbar é fixed):
   as páginas do banco ainda tinham body{padding-top:190px} => folga de 60px
   entre o cabeçalho (130px) e o conteúdo. */
body { padding-top: 104px !important; }
@media (max-width: 1024px) { body { padding-top: 92px !important; } }
@media (max-width: 768px) { body { padding-top: 130px !important; } }
`;

fs.writeFileSync(REPO + "public/puck/navbar.css", out);
console.log("gravou public/puck/navbar.css:", out.length, "bytes");
// valida
const v = parse(out);
console.log("regras no navbar.css:", v.length, "| com 190px:", v.filter((r) => /height:\s*190px/.test(r.body)).length, "| com 130px:", v.filter((r) => /height:\s*130px/.test(r.body)).length);
