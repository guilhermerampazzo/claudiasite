# Onde paramos — 23/09/2026 (home: hero menor e sem sobreposição)

## Reclamação da cliente (print dela)
"Na home o **hero está muito grande** e o **texto está sendo sobreposto** pela
logo, textos e botões."

## Causa (medido com Playwright + capa aberta lado a lado)
- A capa **desktop** da home tem só o **texto pintado em46%..63% da altura da
  foto** (mais a linha) — **sem logo** (o logo é HTML).
- O hero estava com `aspect-ratio:16/9` ⇒ altura **inteira** da proporção
 (**945px** numa tela de950 ⇒ cortava a dobra = "muito grande") e o conteúdo
 centralizado colocava o **logo HTML em30%..54%** ⇒ por cima do texto pintado
 (o "fantasma" que ela viu) e os **botões em72%** ⇒ por cima da linha.
- (Mobile estava bom: logo27..46%, texto~52..62%, botões66%.)

## Correção (`public/puck/hero.css`, só `min-width:769px`)
Receita com a foto **ancorada no topo** (corta só o chão, nunca o texto):
| Regra | Por quê |
|---|---|
| `height: calc(35.5vw + 96px)` | `35.5vw =0.63×0.5625W` = **fim exato do texto pintado**; +96 = espaço dos botões |
| `background-position:50% 0` | corta só o rodapé da foto (sofá/mesa) |
| `.hero-content{flex:1; justify-content:space-between}` | logo **colado no topo**, botões **colados no rodapé** |
| `padding-top:40` / `padding-bottom:20` | ancoras fixas |
| logo `min(520px, calc(64.7vw -125px))` | largura **calculada** para terminar sempre acima do texto |
| `.hero-respiro{display:none}` | o respiro de96px não cabe na composição |

## Validado (dev:769/1024/1366/1680/1920/2560 + mobile390 → **PROBLEMAS:0**;
produção:1024/1366/1680/1920 +390 → **PROBLEMAS:0**)
- altura exata (`0.355W+96`) em todas as larguras;
- **folga do logo** =10 (769) /17 (1024) /105 (1366) /187 (1680) /249 (1920) px;
- **folga dos botões =25..26px constante** (abaixo da linha pintada);
- zero transbordo e **hero cabe na primeira dobra** (a seção "Escolha o que"
  aparece sem rolar);
- **mobile intacto** (hero693 =177,78vw, sem corte);
- conferido visualmente lado a lado com a capa.
- Commit `f08095d`; conferi `35.5vw`/`64.7vw` **dentro do container** antes de
  validar (lição do lote anterior).

# Onde paramos — 23/09/2026 (logos "Quem confia" padronizadas)

## Pedido da cliente
Na home, seção **"Quem confia na Casa Estampa"**: tamanho das logos
**padronizado**, todas **sem fundo** e na cor **branca** — igual ao que já
fizemos no **Corporativo**.

## Como estava (medido no ar, antes)
- `height:140px` mas imagens **não aparadas** (360×360 com margens
  transparentes) → tamanhos visuais bem diferentes (10% a33% de opacidade);
- `filter: grayscale(.35)` + `opacity:.85` → logo **colorida/acinzentada**, não
  branca;
- **Fairmont com placa branca** (`chip:"yes"` → `background:#fff; padding:18`)
  → o "fundo" que a cliente reclamou.

## Padrão de referência (medido no Corporativo)
- imagens aparadas em `assets/scraped/home/norm/` (RGBA, fundo transparente);
- **altura fixa:100px (desktop) /74px (mobile)**, `width:auto`,
  `object-fit:contain`;
- `filter: brightness(0) invert(1)` (branca), `opacity:1`,
  caixa sem `background`/borda/padding.

## O que foi feito
- `scripts/normaliza-logo.mjs`: recorta pelo bounding box do alfa → criou
  **`norm/gafisa.png` (275×87)** e **`norm/cachoeiras.png` (311×123)** (faltavam;
  as outras4 já existiam por serem do Corporativo).
- `initial-home.json`: as6 logos passam a apontar para `norm/*`; **removido**
  o `"chip": "yes"` do Fairmont.
- `lib/puck/config.js`: componente `Clientes` sem mais a placa branca
  (removido o `style` do chip **e** o campo `chip` do editor).
- `public/puck/blocks.css`: `.clientes-grid img` → altura **100px**,
  `filter: brightness(0) invert(1)`, `opacity:1`,
  `background:transparent; padding:0; border:none` + **74px** no mobile.

## Validado em produção (Playwright1366 e390)
- **HOME = REFERÊNCIA: SIM ✅** nos dois tamanhos — mesmas alturas
 (`100px`/`74px`), mesmo filtro, fundo `rgba(0,0,0,0)`, `opacity:1`;
-6 logos, **zero imagem quebrada**, larguras162–316px (desktop) e120–234px
 (mobile) → células padronizadas;
- HTML sem `chip`; `blocks.css` com o filtro novo; as6 `norm/*` → **200**;
- `PROBLEMAS: 0`.

## Cuidado com o build (aconteceu nesse lote)
O **1º build** da VPS saiu com código antigo (fetch/build antes de o GitHub
confirmar o ref). Sintomas: `norm/gafisa.png`→404 e HTML/CSS velhos.
Corrigi com `git fetch origin main` explícito + conferi **dentro do container**
(`ls` do `norm/`, `grep` do CSS/JSON) antes de validar. Sempre conferir o
arquivo **no container**, não só o HEAD do repo.

# Onde paramos — 23/09/2026 (banners novos da cliente)

## O que chegou em `capasnovass/` (23/09)
| Arquivo | Dimensão | Destino |
|---|---|---|
| `computador/papel de parede.jpg` | 1600×900 | `uploads/capas/papel-parede.jpg` (substitui a composição automática) |
| `computador/persianas.jpg` | 1600×900 | `uploads/capas/persiana.jpg` (idem) |
| `celular/home.jpg` | **900×1600 (9:16)** | `uploads/capas/mobile/home.jpg` |

## Conferência por md5 (23/09) — nada mais pendente
**13/13 pares** entre `capasnovass/`, `uploads/` local e o **volume Docker da
VPS** estão byte a byte iguais. Em particular, `celular/papel de parede.jpg` e
`celular/persianas.jpg` (de21/09) são **idênticos** aos
`uploads/capas/mobile/papeis-de-parede.jpg` e `persianas.jpg` já publicados —
a referência `?v=20260921` deles segue **correta** (conteúdo inalterado desde
que aquela URL foi ao ar; trocar o `?v` sem mudar a imagem seria refetch à toa).
Ou seja: os3 arquivos novos de hoje já estão no ar e o resto não precisa de
troca. Se chegar arte nova, é seguir o mesmo caminho (trocar arquivo +
`?v=` novo em todas as referências).

## Ajustes necessários junto
1. **Proporção da capa mobile da Home mudou** (2:3 → 9:16): `blocks.css`
   `min-height` do hero mobile `150vw` → **`177.78vw`** (senão o cover cortava
  16% da altura). Validado em360/390/414: hero = capa, **100%/100%**.
2. **Cache immutable** (`max-age=1 ano`) → troca de URL em TODAS as
   referências: `?v=…20260921/20260923` → **`?v=20260923b`** em
   `papeis-de-parede.json`, `persianas.json`, **`initial-home.json`** (o dado
   salvo manda, não o `defaultProps` do config.js), `config.js` e thumbs do
   `registry.js`.

## Operação
- Imagens trocadas **localmente** e **no volume docker da VPS**
  (`claudiasite_site_10215_uploads/_data/capas/…`) — md5 igual ao local.
- Backups: `/www/backup/capa-papel-parede-composta_*`, `capa-persiana-composta_*`
  e `capa-home-mobile-antiga_*` (20260923_130458).
- Commit `d800adc`; **atenção**: o primeiro deploy saiu em paralelo com o
  push e a VPS ficou no commit antigo — refiz em sequência (HEAD `d800adc`,
  container com os3 arquivos novos).

## Verificado no ar
- refs `?v=20260923b` presentes em `/`, `/papeis-de-parede`, `/persianas`;
  `blocks.css` com `177.78vw`;6 páginas →200.
- Playwright (produto): home360/390/414 → hero `360x640 /390x693 /414x736`
  com capa `900x1600` → **largVis/altVis =100%**, sem transbordo;
  papéis e persianas em1366 → capa `1600x900` → **100%/100%**;
  `valida-hero` (7 páginas ×1024/1366/1920) → **PROBLEMAS:0**.

# Onde paramos — 23/09/2026 (hero desktop: capa sem corte + botão sob o texto)

## Reclamação da cliente (prints do computador dela)
"Nos heros (primeira seção) a imagem não está encaixando direito, ficando
muita grande; outras o botão está ficando por cima."

## Causa (medida no ar, ANTES — e **não** era a mudança de cabeçalho:
teste ligando/desligando o `navbar.css` deu o mesmo hero em12 casos)
| Página | Capa usada no desktop | Altura visível1366 /1920 |
|---|---|---|
| **papéis** | **retrato1024x1536** (errada) | 36% / **27%** → título "Papéis de Parede" cortado, texto gigante |
| **persianas** | **retrato1024x1536** (errada) | 35% / **25%** → idem |
| **corporativo** | paisagem mas hero fixo em**520px** | 68% / **48%** → botão em cima do texto |
| pisos, cortinas, arquitetos | paisagem, hero fixo **720px** |94% / **67%** → botão sobre o subtítulo |
| home | paisagem, altura por conteúdo |100% /83% |

Raiz: `background-size:cover` com **altura fixa em px** — quando a tela é mais
larga (1920) cortava topo/baixo e os botões HTML caíam sobre o texto pintado;
quando a "largura CSS" encolhia (zoom do navegador) esticava a foto e o texto
pintado ficava enorme/cortado. E faltavam **capas paisagem de papéis e
persianas** (`capasnovass/computador/` só tem5).

## O que foi feito
1. **`scripts/monta-capa-paisagem.mjs`** (`npm run capa:paisagem`): compõe
   capa **1600x900** a partir da retrato — fundo = mesma foto em
   cover+blur+véu escuro, frente = capa inteira ajustada pela altura (**nada
   cortado**). Gerou as capas de `papel-parede` e `persiana`.
   - `uploads/capas/*.jpg` trocados (fora do git); na VPS o `uploads` é
     **volume docker** (`claudiasite_site_10215_uploads/_data/capas/`), com
     backup em `/www/backup/capa-*-retrato_20260923_123028.jpg`.
   - `?v=20260921 → 20260923` nas2 páginas congeladas (cache é immutable).
2. **`public/puck/hero.css`** (só `min-width:769px`, mobile intacto):
   - `aspect-ratio:16/9` + `min-height:0` → a altura segue a largura ⇒ o
     `cover` **nunca corta** (janela estreita, zoom do navegador,1920…);
   - `justify-content:flex-end` + `padding-bottom:7%` (escala com a largura) ⇒
     os **botões descem para o rodapé da capa, sempre abaixo do texto pintado**;
   - home mantém conteúdo centralizado com tamanhos em `%`/`vw`
     (logo `min(560px,41vw)`, respiro `3vw`, margem dos botões `15%`) para
     caber na proporção — antes transbordava em911/1024.
   - injetado em `/`, `/pisos`,5 `*.head.html` e no `renderHtml` (depois do
     `navbar.css`); no v2 o respiro ganhou a classe `hero-respiro`.

## Validado
- **Local,6 larguras ×7 páginas** (600/911/1024/1366/1920/2560): de911 a2560,
  `largVis/altVis =100%`, `transborda=false`, botões a69–84% da altura.
- **Produção,4 larguras ×7 páginas**: idem (100%/sem transbordo, botões
  78–84%). `hero.css` 200 + presente nas4 páginas testadas; capas novas
  servindo121407/121363 bytes com `?v=20260923`.
- **Visual**: recorte da zona inferior em1920 (arquitetos/corporativo/cortinas)
  confirma botão **abaixo** do texto com folga; capas compostas de papéis e
  persianas com título/subtítulo inteiros.
- Casa `home` a2560 os botões ficam a65% (folga pequena mas sem sobreposição)
  — único caso apertado; não afeta1366/1920.
- Commits: `06805ab` (+docs). VPS `web` rebuildada, db intacto; backups das
  capas antigas em `/www/backup/`.

## Pendência (arte)
Ideal: pedir à designer as **capas paisagem1600x900 de Papéis de Parede e
Persianas** (as outras5 existem em `capasnovass/computador/`). Enquanto isso
vale a composição automática (fundo borrado) — `npm run capa:paisagem
<retrato> <saida>`.

# Onde paramos — 23/09/2026 (cabeçalho único em todo o site)

## Pedido da cliente
"Cada página está com um cabeçalho diferente — precisava que todas fossem o
mesmo cabeçalho (o da home)."

## O que existia (medido no ar,4 variantes)
| Origem | Divergências |
|---|---|
| `/` e `/pisos` (v2 React) | referência… mas o **pisos não tinha o ícone do WhatsApp** no botão |
| 5 páginas congeladas (`*.head.html`) | barra **social** + **busca** no topo, texto do botão **branco** (no corporativo o botão aparecia **mostarda** no desktop) |
| páginas do banco (álbuns, produtos, catálogo, categorias) | header **190px** no mobile (vs130), **sem a linha telefone/Loja Virtual**, ícone do logo44/58px, social + busca |

## Como ficou — fonte ÚNICA
- **`lib/navbar.js`** — `NAVBAR_HTML` (o nav da home, com `data-ce-canonical`),
  `NAVBAR_INNER`, `NAVBAR_CSS_LINK` e `bindNavbarToggle` (usa `onclick=`, não
  `addEventListener`, senão o StrictMode duplicava o handler).
- **`public/puck/navbar.css`** — grade + cores da home; gerado por
  `npm run navbar:css` (`scripts/gen-navbar-css.mjs`) a partir de
  `global.css` + `blocks.css`, **carregado por último em toda página**.
- Ligações: `/` e `/pisos` (React, `dangerouslySetInnerHTML` **sem state** —
  com state o React recriava os filhos e o handler/`aria` sumiam), os5
  `*.head.html` congelados, e `lib/db.js`
  (`getHomeHeaderHtml()` devolve o canônico; `applySiteChrome` não reescreve
  mais o header canônico; `renderHtml` injeta o `navbar.css` após o global).

## Dois problemas que apareceram na validação (e foram corrigidos)
1. **`body.elementor-page-26152 .navbar-logo img{width:auto!important}`** no
   `site.css` das congeladas vencia por especificidade → ícone do logo do
   Papéis em **58px** (home:48). O `navbar.css` agora tem uma **segunda
   passada blindada** com seletores `body .navbar …` (mais específicos).
2. **`body{padding-top:190px}`** do CSS global continuava valendo nas páginas
   do banco (o nav já era130) → **folga de60px** sob o cabeçalho. Agora o
   padding acompanha a altura do header (104 /92 tablet /130 mobile).

## Validado no ar (Playwright,12 páginas ×390 e1280 =24 checagens)
- **1 único hash de markup** (`b596afc7`) nas24 → cabeçalho byte a byte igual.
- `navH/bodyPad` =130/130 (mobile) e104/104 (desktop) em **todas**.
- botão bege `rgb(194,165,122)` + texto escuro + ícone WhatsApp ✓
- linha de contato: `flex` no mobile / `none` no desktop ✓
- social e busca **ausentes** em todas ✓ ·7 itens de menu ✓ · ícone48 no
  desktop (Papis saiu de58) ✓ · `navbar.css` carregado ✓
- menu mobile abrindo/fechando com `aria-expanded` certo e **380px** em todas
  (o Papéis abria com gap:16px =476px).
- Commits: `88a9007` (unificação) + `8b8bfcf` (blindagem/padding); VPS em
  `8b8bfcf`, `web` rebuildado, db intacto.

## Observação
Para ficar **igual à home**, saíram do cabeçalho das outras páginas: a barra
social e a busca (a home não tem). Se quiser de volta em todas, é adicionar
os dois blocos ao `NAVBAR_HTML` — com o `navbar.css` elas continuariam com o
mesmo visual.

# Onde paramos — 23/09/2026 (álbuns de papéis: grid + links)

## Reclamações da cliente
1. Up to Date e "Storie of light" (= Stories of Life): **não abrem**.
2. Absolutely Chic, Björn e Flow 3: **"só de um lado"**.
3. Mobile: **tudo indo para a direita** (deveria ser 2 por linha).
4. Desktop: **xadrez**, e no espaço vazio havia um álbum invisível.

## Causas (todas confirmadas no ar)
1. **`<a>` aninhadas duplicadas** no HTML dos álbuns:
   `<a href="/produto/x"><a href="/produto/x"><article class="prod-card">…</article></a></a>`.
   HTML não permite `<a>` dentro de `<a>` → o parser fecha a externa na hora e
   sobra uma `<a>` **vazia** ocupando célula (37 em boho, 49 em bjorn/chic,
   72 em flow-3, 54 em botanica). Resultado: colunas alternadas vazias no
   desktop (xadrez) e **todos os cards na coluna 2** no mobile.
   O "álbum invisível" que a cliente viu era exatamente essa `<a>` vazia
   (o status bar mostrava `/produto/boho-35785`).
2. **Capas sem link** na página de categorias: o `<img alt="Álbum Up to Date">`
   e o de Stories of Life **não eram embrulhados em `<a href>`** — o único link
   desses cards era o botão "Ver modelos", que é `display:none` em **todos**
   os álbuns (padrão do layout). Clicar no card não fazia nada.
3. (Achado na auditoria) **16 álbuns com cards de produto sem `<a href>`** —
   clicar no papel de parede não abria o produto (up-to-date e stories também).

## Correções
- `lib/html-utils.js` — `collapseNestedAnchors`, `wrapAlbumCovers`,
  `wrapProductCards`, `buildProductIndex` (match por **slug → nome → sufixo do
  slug**, porque o texto do card vem sem o prefixo do WP; só aceita sufixo
  **único** e alvo ≥ 6 chars) + `fixAlbumHtml` — todos idempotentes.
- `lib/db.js` — `fixAlbumHtml` no pipeline do `renderHtml` (rede de segurança;
  **não** cobre as páginas congeladas do v2, que não passam pelo render).
- `content/original/papeis-de-parede.html` — 60 capas religadas (58 hrefs, todos
  testados 200) + typo `Contempoâneo` → `Contemporâneo`.
- `public/puck/pages/papeis-de-parede.json` — a página congelada é a que serve
  `/papeis-de-parede`: +2 capas (18/18 com link). Substituição cirúrgica no texto
  cru pra não reescrever a formatação do JSON.
- `content/albuns/*.html` — **+2188 links de produto** em 35 arquivos (fonte do
  reimport; sem isso um `import-albums` apagaria tudo).
- `scripts/fix-album-links.js` — mesma correção aplicada ao banco.

## Execução e deploy
- Commits: `f43c960` (banco + render + fonte de papéis), `d4d5e12` (fontes +
  JSON congelado), `df32b6c` (script).
- **Backup antes de mexer no banco:** `/www/backup/pages_pre_albuns_20260923_035135.sql` (8,9M).
- Banco: 6 páginas (âncoras + capas) e depois 18 páginas (**+1175 links de
  produto**); reexecução em dry = `alteradas: 0` (idempotente).
- Deploy: `git reset --hard origin/main` + `build web` + `up -d web`; db intacto.

## Validado no ar (Playwright 1280/390 + crawl dos 59 álbuns)
- **Grid:** 5 colunas no desktop / **2 por linha** no mobile, `anchorsVazios: 0`,
  `cardsSemLink: 0` em boho, bjorn, flow-3, chic, botanica e up-to-date.
- **Categorias:** 59/59 álbuns com card clicável, **0 capas sem link**; clique
  real → `/up-to-date` = h1 "Álbum Up to date" e `/stories-of-life` = h1
  "Álbum Stories of Life".
- **591 hrefs de produto** gerados testados no ar = **todos 200**.

## Pendências conhecidas (ficaram sem link de propósito — não inventamos URL)
- `album-city-romance`: 21 produtos e `album-joy`: 1 não existem no catálogo.
- `album-travertino`: 2 capas de seção "veja também" sem href candidato.

# Onde paramos — 22/09/2026 (capas da home e pisos no mobile)

## Reclamações da cliente (prints de celular)
1. **Pisos:** o botão "Ver por tipo" aparecia **por cima** do subtítulo.
2. **Home:** o texto da capa **cortava** nos dois lados e o hero estava **grande demais**.
3. **Home:** tirar o **preto com opacity** que ficava por cima da imagem.

## Causa (reproduzida com Playwright a 390/360 no ar = v2)
- Os títulos/subtítulos das capas estão **pintados na imagem**, não no HTML
  (home: `showTitle/showSub = "no"` em `initial-home.json`; nada de `<h1>` no DOM).
- **Home:** o `<style>` mobile aplicava a capa retrato
  (`/uploads/capas/mobile/home.jpg`, 1024x1536) em `.hero`, mas a camada visível
  é a filha `.hero-bg` (`inset:0`) com a capa **paisagem** 1600x900 → `cover` em
  390x809 cortava os lados e escondia a capa mobile. Hero ainda ganhava
  `margin-top:min(30vh,280px)` (global) + spacer de 96px = 809px de altura.
  Escuro: `.hero-bg::after` = `linear-gradient(rgba(28,24,16,.55) → .70)`.
- **Pisos:** **não existe capa mobile** (nem em `uploads/capas/mobile/`, nem em
  `capasnovass/celular/` — as outras 6 páginas têm) → capa 1600x900 dentro de um
  hero de 726px mostrava só ~48% da largura da foto (texto cortado dos dois lados)
  e o botão, empurrado 280px, caía em cima do subtítulo.

## Correções (mobile ≤768px; desktop intacto, exceto o véu escuro)
- `lib/puck/config.js` — o `<style>` mobile agora mira `.hero, .hero .hero-bg`
  (a camada que realmente pinta), com `background-repeat:no-repeat`.
- `public/puck/blocks.css` — remove `.hero-bg::after` (preto);
  `min-height:150vw` = proporção exata da capa retrato (1024/1536) → `cover` não
  corta nada; `hero-actions margin-top:24px` (vence os 280px do global por
  especificidade: `.ce-puck-scope .hero .hero-actions`); `hero-content padding:40px`.
- `public/puck/pisos.css` — bloco mobile novo: `section.hero{min-height:135vw;
  justify-content:flex-end; background-position:57.5% 50%; padding-bottom:16px}`
  + `section.hero .hero-actions{margin-top:0}` → a janela visível da foto fica em
  ~690px **em qualquer largura** (o texto inteiro cabe) e os botões descem para
  **depois** do subtítulo.

## Validado (dev local `:3111` + Playwright 390 / 360 / 1280)
- Home 390: hero 809 → **585px**, texto inteiro, sem véu escuro, botões dentro.
- Pisos 390/360: texto inteiro, botão **abaixo** do subtítulo (hero 726 → 527/486).
- Desktop 1280: alturas inalteradas (home 891 / pisos 720); só perdeu o véu escuro.
- Grep: nenhuma outra camada escura sobrou nos CSS do v2 (os dois `rgba(28,24,16,.92)`
  que restam são a navbar).

## Pendências
- Commit + push + deploy VPS (`build web` + `up -d web`) — nada publicado ainda.
- **Falta asset:** capa **mobile** de Pisos (retrato 1024x1536, como as outras 6);
  hoje resolve-se com o ajuste de altura/posição, mas o ideal é a capa nova.
- Contraste: sem o véu, o texto claro da capa da home fica sobre foto clara — se a
  cliente achar fraco, dá para por um véu bem leve (~10%) só no desktop.

# Onde paramos — 21/09/2026 (novo editor v2 + 7 páginas com fidelidade 0px)

## Objetivo
Substituir o editor próprio (que quebrava mobile/PC) por um editor Puck, com
fidelidade 100% ao site no ar em celular (390) e computador (1280).

## Como está
- **Backup:** tag git `pre-puck-20260921` + `.backups/20260921-pre-puck/`
  (`dirty.patch` + `worktree.tgz`). Nada do site no ar foi alterado.
- **Editor novo:** `/admin/v2` (índice) e `/admin/v2/<slug>`.
  - `home` e `pisos`: blocos React (Puck) com campos editáveis (texto/imagem/link/ordem).
  - `papeis-de-parede`, `cortinas`, `persianas`, `arquitetos-designers`, `corporativo`:
    "congeladas" — cada seção é o markup original, injetado no DOM (mesmas tags →
    mesmo CSS). Editor por seção (rótulo + HTML).
- **Preview/publicação v2:** `/v2-home`, `/v2-pisos` e `/v2/<slug>` (recompõe
  `head + seções + tail`, idêntico ao ar).
- **Fidelidade medida** (Playwright, altura de cada seção, live vs v2):
  **0px em 1280 e 390 nas 7 páginas**; 0 recursos faltando (mídias espelhadas).

## Arquivos-chave
- `app/admin/v2/` (editor), `app/v2-home/`, `app/v2-pisos/`, `app/v2/[slug]/route.js`.
- `lib/puck/`: `config.js` (home), `pisos.js`+`library.js` (pisos), `frozen.js`
  (seções congeladas), `registry.js`, `initial-*.json`.
- `public/puck/`: `global.css` (gerado do `buildGlobalCss`), `blocks.css` (home),
  `pisos.css` (pisos), `pages/<slug>.{css,json,head.html,tail.html}` (congeladas).
- `app/admin/layout.js` — `admin.css` agora é só do admin (antes vazava para o site:
  era a causa das "páginas diferentes").

## Importante
- `.env` local: `UPLOAD_DIR` aponta para a pasta `uploads/` do repo (gitignored);
  na VPS permanece `/app/uploads`. Mídias espelhadas (~330MB) NÃO vão no git.
- Nada foi publicado na VPS; o site no ar e o editor antigo seguem funcionando.

# Onde paramos — 15/09/2026 (capas novas nos heroes — 7 páginas)

## Videos 15/09-6 — sections de 195px soltadas via JS (publico + editor)

## Fornecedores 15/09-7 — revert persianas + cards escuros nos albuns (VPS `081afcc`)
- Persianas voltou ao modelo texto+botao (redesign removido); equalizador por fileira mantido.
- Paginas de categoria/album (`lib/catalog-html.js`): cards escuros — foto 4/3 + `N PRODUTOS` dourado + titulo branco + seta em circulo (mockup cliente). Vale p/ categorias e produtos, mobile e desktop.

## Persianas 15/09-3 — videos inteiros + cards iguais (commit `fix(persianas): videos inteiros a prova de cache` / VPS `4c9e64a`, deploy so web)
- Videos ainda cortados no celular mesmo com CSS novo: markup reescrito no banco — 4 colunas `.mot-video-ph` (wrapper absoluto 16/9) viraram `.ce-video-natural` com video em fluxo normal (script `fixmot.py`, backup `/www/backup/pages_persianas_antes_motnatural_20260915.html`). Classe nova sem regra legada = funciona com qualquer cache.
- Cards Amorim/Rio/Gabriel/Coimbra: botoes VER MODELOS alinhados na base via absolute + padding-bottom nos 4 cards.

## Heroes 15/09-4 — revert + textos do hero via banco
- A regra `.elementor > section:first-of-type` apagou textos do SITE INTEIRO — REVERTIDA.
- Textos dos heroes Elementor ocultos via `ce-hero-hide` no banco (pap 5, cor 5, per 4 widgets). Verificado: resto visível.

## Lote 15/09-5 — cards iguais via JS + Fairmont bege + capa corporativo alinhada (VPS `22fa337`)
- `buildFabEqualScript`: equaliza altura dos 4 `.fab-card` POR FILEIRA (1o deploy igualou as 2 fileiras juntas e esticou — corrigido com agrupamento por offsetTop, testado em mini-DOM) e cola botões na base.
- Fairmont/MedSenior: classe `caso-logo-claro` no banco + placa bege; bege venceu chip aninhado com `body .caso-logo .caso-logo-img.caso-logo-claro` (0,4,1); Fairmont reduzida p/ 52px mobile, demais logos 68px.
- Capas: corporativo alinhada (e3de9c8e) e depois centralizada (de2208eb) em `capas/corporativo.jpg`.
- Diagnóstico importante: `.ce-hero-hide` e regras novas SEMPRE estiveram no ar — screenshots que mostravam o contrário eram cache do celular; validação real via Playwright (getComputedStyle + prints em `Área de Trabalho/print/`).
- Botões dos heroes mais para baixo nas 7 páginas:  no bloco de botões ( e  do 1º top-section). Deploy só , 200 nas 7 rotas com a regra.

## Capas 15/09 (sem commit de código; só arquivos + UPDATE no banco)
- Cliente enviou 7 capas em `capasnovas/` → subidas p/ volume `uploads/capas/*.jpg` (HTTP 200 todas).
- Heroes trocados (URL antiga → nova, 1 ocorrência cada, backup da linha em `/www/backup/pages_<slug>_antes_capas_20260915.html`):
  home→`capas/home.jpg`, papeis→`capas/papel-parede.jpg`, cortinas→`capas/cortinas.jpg`, persianas→`capas/persiana.jpg`, pisos→`capas/pisos.jpg`, corporativo→`capas/corporativo.jpg`, arquitetos→`capas/arquiteto-design.jpg`.
- Botões dos heroes mantidos (só a foto trocou). Sem rebuild (render é dinâmico); 200 nas 7 rotas com a capa no HTML.
- Atenção: capa da home já estava no ar desde o lote anterior — celular da cliente mostrava cache antigo (fechar/reabrir o Safari resolve).

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
