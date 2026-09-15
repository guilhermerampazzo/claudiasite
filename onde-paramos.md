# Onde paramos — 15/09/2026 (lote cliente: carrossel papéis + FAQ cortinas/persianas + vídeos persianas)

## Lote 15/09-2 — passos + logos (commit local `a028dc4` / VPS `874808a`, deploy só `web` 15/09)
1. **Persianas "Como funciona" com letras juntas + corporativo "passo a passo correndo pro lado"** — causa: regras 09/09 forçavam 5-col/scroll horizontal no mobile. Fix: mobile empilha 1 passo por linha (número em cima, título 17px, texto 14px); **exceção: papéis mantém os 5 lado a lado** (regra escopada `body.ce-slug-papeis-de-parede`, pedido anterior mantido).
2. **Logos corporativo apagadas** — Pio XI (branca) sumia no chip creme. Fix: chip escuro `#1d150c` (vence inline `background:#fff`), logos maiores (58-64px), `filter:none`.
3. **Vídeo corporativo com capa errada (sala de aula) — RESOLVIDO 15/09**: a capa era um `poster` antigo (`/assets/revisao/img/WhatsApp-Image-2026-07-20...jpeg`). Extraídos frames do `.mov` (1080×1920, 59s) com ffmpeg na VPS; escolhido t=5s (Cláudia apresentando no hotel) → `/uploads/2026-09-15/fairmont-capa.jpg` (178KB, HTTP 200) aplicado via `UPDATE pages ... poster=... WHERE slug='corporativo'` (backup da linha em `/www/backup/pages_corporativo_antes_capa_20260915.html`; sem rebuild — render é dinâmico; verificado `poster=` no HTML ao vivo).
- Sem backup novo (último da sessão `20260915_154449` ainda válido — só mudou `lib/db.js`); db e `casaestampadocker-*` intactos; 200 em persianas/corporativo/pisos/papeis/cortinas com novas regras.
- **Pendente:** `git push origin main` (sem credencial GitHub).

## Lote 15/09 — 4 pedidos (commit local `faec96c` / VPS `c425275`, deploy só `web` em 15/09)
1. **Papéis, carrossel "Veja como fica na prática" com laterais escuras + fotos pequenas** — causa: gradientes em `.insp-carousel-wrap::before/::after` (nunca anulados; regra antiga só limpava o slide). Fix `lib/db.js`: wrap `display:none`, mobile 1 foto 100% `min-height:430px`, desktop 220×300 (wide 340).
2. **FAQ cortinas/persianas: "+" não abre e 2 símbolos juntos** — markup real `h3.elementor-tab-title > icon(closed/opened > .ce-faq-icon) + a.elementor-toggle-title` com conteúdo inline `display:block`. Fix: CSS nuclear esconde TUDO dentro do ícone (1 "+" via `::after`, sem `:has`) + `buildFaqToggleScript` reescrito com delegação no document (clique no h3, no link interno ou no ícone; fecha os outros; remove inline display no boot). Comportamento provado com teste do script real em mini-DOM.
3. **Vídeos persianas cortados** — coluna com inline `aspect-ratio:16/9` + wrapper `[data-ce-bg-video]` absoluto cortava o vídeo vertical. Fix: wrapper vira fluxo normal em TODAS as larguras (sem `:has`), vídeo `contain` + altura auto (`max-height` 78vh desktop / 82vh mobile) + `buildMotVideoScript.fitSlot` desfaz via inline `!important` em qualquer largura.
4. **Editor (computador 1280 / celular 390)**: preview usa o mesmo CSS global; adicionado `<script id="ce-preview-behaviors" data-ce-ui>` no bridge (FAQ clicável + unwrap de vídeos no preview, removido no save via serialize).
- Deploy: backup `/www/backup/claudiasite_backup_20260915_154449.tar.gz` (1.7G) + `db/claudiasite_db_20260915_154449.sql` (18M); `build web` + `up -d web` (db e `casaestampadocker-*` intactos); validado `curl 127.0.0.1:10215` 200 nas 4 rotas com novas regras presentes.
- **Pendente:** `git push origin main` (sem credencial GitHub nem local nem na VPS — commit pronto nos dois lados, mesmo conteúdo).

# Onde paramos — 03/09/2026 (atualizado pós-deploy VPS)

## O que a cliente quer
- Print (mobile, página Papéis de Parede): o botão do cabeçalho circulado de verde **não funciona**.
- O botão é o **hamburger do menu mobile** (vira X ao tocar, mas nada acontece).

## O que foi feito (diagnóstico confirmado via Playwright)
- Reproduzido em `http://localhost:10215/papeis-de-parede` a 390px: o menu abre no DOM
  (`is-menu-open`, lista visível no a11y), mas **fica invisível/clipado** — o clique
  acerta o hero atrás dele.
- Causa raiz: `public/assets/revisao/site.css` tem 2 blocos mobile da página
  Papéis de Parede com `overflow-x: auto !important` na `.navbar`
  (linhas ~3097 e ~3156, seletores `body.elementor-page-26152 .navbar` e
  `.ce-exact-page.ce-exact-papeis .navbar`).
  - Essa regra ganha do override global (`lib/db.js`, `.navbar{overflow:visible!important}`)
    por especificidade maior → `overflow` computado vira `auto` → o dropdown absoluto
    do menu (`top:190px`, fora da navbar de 190px) é cortado.
  - Só afeta Papéis de Parede (regras escopadas por `elementor-page-26152` / `ce-exact-papeis`).
- Correção aplicada no fonte: trocado `overflow-x: auto !important` → `overflow: visible !important`
  nos 2 blocos de `public/assets/revisao/site.css`.
- Commit `e5ca0df` (`fix(papeis-mobile)...`) com push para `origin/main`.
- Arquivo sincronizado nos containers Docker (`docker cp` para `claudiasite-web-1` e
  `claudiasite_local-web-1`), pois a porta 10215 é servida pelo container (build antigo).

## Deploy VPS 187.127.44.130 (só projeto claudiasite, feito em 03/09/2026)
- Inspeção somente-leitura antes: 2 compose projects (`casaestampadocker`,
  `claudiasite_site_10215`); volumes separados; `.env` preservado (untracked, `HOST_PORT=10215`,
  `PUBLIC_SITE_URL=https://claudia.codermaster.com.br`).
- Na VPS, só em `/www/wwwroot/claudiasite`: `git reset --hard origin/main` (foi p/ `e5ca0df`),
  `docker compose -p claudiasite_site_10215 build web` + `up -d web`.
- NÃO mexido: `db` do claudiasite (Up 5 dias, healthy), `casaestampadocker-*` (Up 2 semanas),
  nenhum volume (`down -v`/`prune` jamais executados), nenhum outro dir em `/www/wwwroot/`.
- Pós-deploy: `docker logs claudiasite_site_10215-web-1` → `Ready`, `curl localhost:10215/papeis-de-parede` → HTTP 200.

## Revalidado no navegador (VPS, 390px, `?v=e5ca0df` p/ furar cache do site.css)
- `.navbar` computado: `overflow/overflow-x/overflow-y: visible`, `z-index: 9999` ✅
- Clique no hamburger: `is-menu-open=true`, `aria-expanded=true`, `.navbar-nav` `display:flex`,
  `visibility:visible`, `opacity:1`, rect 375×476 em y=190, itens Início, Papéis de Parede,
  Cortinas, Persianas, Pisos, Arquitetos, Corporativo ✅ (screenshot do viewport salvo na sessão)
- Fechar: ESC fecha (`is-menu-open=false`) ✅; tocar no X abre/fecha (toggle) ✅
- Desktop 1280px: `listDisplay:flex`, `toggleDisplay:none`, menu fechado, nada quebrado ✅

## O que falta
1. Observação extra (não mexido): no mobile dessa página o CTA "Falar agora" do header
   é oculto por `body.elementor-page-26152 .navbar-wa{display:none !important}` no mesmo
   arquivo — confirmar com a cliente se é intencional.
2. (Opcional) testar fechar pelo clique num link do menu e rodar um giro em outras páginas mobile.

## Filtro de categorias — Papéis (vídeo cliente 02/09, corrigido 04/09, commit 94f6216)
- Reclamação: ao tocar numa categoria, o conteúdo "aparece torto no meio" —
  era p/ mostrar só os selecionados e apagar o resto.
- Causa: o `active` ia só no `<a>` interno, mas o CSS (`.cat-pill.active`) destaca o
  WRAPPER elementor → o amarelo ficava preso no "Todos" com o conteúdo de outra
  categoria; além disso o `scrollIntoView` colocava a seção embaixo do header fixo (190px).
- Fix em `lib/db.js`: `setActive` alterna `active` no link E no `closest('.cat-pill')`;
  CSS global `.cat-section{scroll-margin-top:200px!important}`.
- Deploy VPS (só `claudiasite_site_10215/web`, db e `casaestampadocker-*` intactos) e
  validado a 390px: Adulto→só Adulto c/ pill amarela, Infantil→só Infantil, Todos→tudo.

## Calculadora de rolos — Papéis (vídeo cliente 02/09 20:47, corrigido 04/09, commits cf0d965+4af2354)
- Reclamação: "digitando e a tela sobe; não tem quadro de resposta nem botão de calcular".
- Causas (confirmadas ao vivo na VPS): no HTML do banco, `#ceCalcBtn` estava dentro de um
  field-group `display:none` (botão 0×0, invisível) e `#ceCalcResultado` estava dentro do
  form do HERO (topo) → o `scrollIntoView` a cada tecla rolava a página p/ cima e o
  resultado aparecia no lugar errado; stats `resM2/resRolos` travados em "—".
- Fix em `lib/db.js` (`buildCalcFixScript` autossuficiente + CSS `#ceCalcBtn/#ceCalcResultado`):
  realoca botão p/ dentro do form e resultado p/ baixo do form (dentro de `.sim-layout`),
  calcula sem scroll ao digitar (scroll só no clique/Enter), aceita vírgula decimal,
  preenche quadro + stats + link WhatsApp, alterna `simVazio/simInline`.
- Deploy: GitHub caiu no meio → subi `lib/db.js` via SFTP (backup em `/tmp/db.js.bak_*`),
  rebuild só do `web`; push feito quando a rede voltou (`94f6216..4af2354`) e VPS
  convergida via `fetch+reset` p/ `4af2354` + rebuild. Db e `casaestampadocker-*` intactos.
- Validado a 390px: 2,5×2,8 → "2 rolos (área 7,0 m²), +10%: 2 rolos", stats 7,0/2, botão
  dourado visível, scrollY parado ao digitar ✅ (screenshots na sessão).
- Não mexido (pré-existente): `.sim-layout` é grid 2 colunas até no mobile (form + card
  "Com dúvida" lado a lado) — se a cliente quiser empilhado, é ajuste à parte.
