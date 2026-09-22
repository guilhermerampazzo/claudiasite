# Casa Estampa — Dossiê Completo para Próxima IA / Continuidade

> **Última atualização:** 2026-08-24 00:45 BRT (página arquitetos-designers responsiva + 3 slots de foto no Morar Mais)
> **Autor:** Opencode + Muse Spark (sessão com cliente via WhatsApp prints)
> **Objetivo deste arquivo:** ser a única fonte da verdade para a próxima IA entender onde estamos, o que foi feito, o que falta e como continuar sem perder nada.

---

## 1. URLs — Principal, Staging, Origin e Rotas para Scraping

### 1.1 Domínios
| Papel | URL | Onde roda | Porta | Pasta no VPS |
|---|---|---|---|---|
| **Staging / Editor (onde a cliente edita)** | **https://claudia.codermaster.com.br** | `187.127.44.130:10215` | `10215` | `/www/wwwroot/claudiasite` (projeto `casa-estampa-editor`, Next 16) |
| **Origin / WordPress oficial (fonte de imagens, vídeos, categorias, para scraping)** | **https://casaestampa.com** | Hospedagem externa (não no VPS) | 443 | — |
| **ERP / Painel interno (NÃO MEXER — contém orçamentos, clientes, 707K de DB)** | `https://painel.casaestampa.com` | `187.127.44.130:3000` | `/www/wwwroot/casaestampadocker` (Next 14 + Prisma) | `casaestampadocker-postgres-1` |
| **Outros vhosts no mesmo VPS (NÃO TOCAR)** | `claudiaw.codermaster.com.br`, `claudiasite` (legado), `default` | — | — | `/www/wwwroot/claudia.codermaster.com.br`, `/www/wwwroot/claudiasite`, etc. |

> **Regra de ouro do cliente:** mexer **apenas** em `/www/wwwroot/claudiasite` (`claudiasite_site_10215-*`). **Nunca** em `casaestampadocker` ou outros `site_*`. Risco de perder orçamentos/clientes.

### 1.2 Rotas do Editor (staging) — todas dinâmicas via `renderHtml` (`lib/db.js:201`)
| Rota | Arquivo | Fonte DB | O que renderiza |
|---|---|---|---|
| `/` | `app/route.js` | `pages WHERE is_home=true AND page_type='page'` (hoje `slug=home`, antes `amorim`) | Home com `hero`, `categorias` (5 `cat-card`), `porque` (carousel 9 fotos), `faq`, `cta-final`, `depoimentos`, `clientes`. Recebe `catalogSection` de `getCatalogSectionCategories("home")` (8 categorias) via `injectCatalogSection`. |
| `/:slug` | `app/[slug]/route.js` | `pages WHERE slug=$1 AND page_type='page'` | Qualquer página de conteúdo: `papeis-de-parede` (88k), `cortinas` (46k → DB 496k após edições), `persianas` (52k → DB 654k), `pisos` (38k), `corporativo` (48k), `arquitetos-designers` (33k), `amorim` (14k), `amorim-tela-solar` (24k) etc. Também injeta `catalogSection` específico (`papeis-de-parede` → Álbuns, `pisos` → Marcas). |
| `/categoria-produto/[...path]` | `app/categoria-produto/[...path]/route.js` | `catalog_categories` + `catalog_products` via `lib/catalog.js` | Vitrine WooCommerce: `renderCategoryPage` com `breadcrumb`, `categoryGrid` ou `productGrid` + paginação. Ex: `/categoria-produto/persianas/amorim-persianas-e-cortinas/` (302 prods), `/rio-flex-cortinas-e-persianas/` (140), `/gabriel-persianas/` (159), `/coimbra-persianas/` (107). |
| `/produto/:slug` | `app/produto/[slug]/route.js` | `catalog_products` + `catalog_product_categories` | Ficha `renderProductPage` com `catalogImage("produto", id)` e CTA WhatsApp. |
| `/catalogo` | `app/catalogo/route.js` | `catalog_categories` raízes | Índice `renderCatalogIndex` (roots). |
| `/admin` | `app/admin/page.js` | — | Login `POST /api/admin/login` → cookie `ce_session` HMAC `SESSION_SECRET`. |
| `/admin/pages` | `app/admin/pages/page.js` | `GET /api/pages` + `GET /api/settings` | Dashboard: lista páginas, `setHomePage()`, cria página, edita `header/menu/footer` e estilo global (`primaryColor #c2a57a`, `accentColor #c8960c`, `fontFamily Montserrat`, `css` extra). |
| `/admin/editor/:slug` | `app/admin/editor/[slug]/page.js` | `GET /api/pages/:slug` + `GET /api/settings` | **Drag-and-drop principal.** Iframe `srcDoc={iframeHtml}` com `withPublicPreviewCss` + `withEditorBridge` (58 widgets, `carousel`/`gallery`/`video`/`mot-video-ph`). `POST /api/pages/:slug` salva `html` cru (sem `data-ce-*`). |

### 1.3 Rotas para Scraping (origin `casaestampa.com` → staging)
- **HTML estático para `content/original/*.html`:** `https://casaestampa.com/` + `/papeis-de-parede/` + `/cortinas/` + `/persianas/` + `/pisos-laminados/` + `/pisos-vinilicos/` + `/nossos-servicos/` + `/produtos/` + `/categoria-produto/em-alta/...` (6) . Esses HTMLs foram salvos em `content/original/` e semeados via `scripts/seed.js` → `pages (slug, html, original_html)`.
- **WooCommerce Store API (catálogo):** `GET https://casaestampa.com/wp-json/wp/v2/product_cat?per_page=100&page=1&hide_empty=false` + `GET https://casaestampa.com/wp-json/wc/store/v1/products/categories?per_page=100` → `storeCategoryMap` para `image.src`; `GET https://casaestampa.com/wp-json/wc/store/v1/products?per_page=100&page=1` → `lib/catalog.js:77 syncCatalog()` com `x-wp-totalpages` paginado, `resolveCategoryPath()` monta `path` hierárquico (`papeis-de-parede/adulto/album-whisper`), `plainText()` limpa HTML. Tabelas `catalog_categories`, `catalog_products`, `catalog_product_categories`, `catalog_sync_runs`.
- **Mídia:** `GET /wp-content/uploads/2022/09/Logo-Original-Fundo-Transparente.png` → normalizado para `/assets/logo-letra.svg` (`lib/source-pages.js:63`). `public/assets/` tem `logo-icone.svg`, `logo-letra.svg`, `assets/scraped/{papeis-de-parede,home,persianas,...}/` com 200+ imagens raspadas (ex: `Papel-de-Parede-Cimento-Queimado.jpg`, `Cortina-Trilo-Duplo...`, `Persiana-Painel-Romana.jpg`, `ALPI-BIANCO-2MM_.jpg`, `Home-Piso-Vinilico-01...jpg`) usadas nos `cat-card` da home. `uploads/` (volume Docker `/app/uploads`) guarda `catalog/categories|products/thumbnails` e vídeos `mot-video` (`/uploads/2026-07-31/17855...mp4` 4 em `persianas`, 4 em `cortinas`).
- **APIs internas úteis para debug:** `GET /api/pages`, `GET /api/pages/:slug`, `GET /api/settings` (retorna `preview_css: buildGlobalCss(settings)`), `GET /api/search?q=`, `GET /api/catalog/categories|/products`, `GET /catalog-media/:kind/:id` (proxy com cache em `uploads/catalog/...`), `POST /api/uploads` (25 MB, `serverActions.bodySizeLimit`).

### 1.4 Env e Secrets (VPS `/www/wwwroot/claudiasite/.env` — não versionar)
```
HOST_PORT=10215
POSTGRES_DB=casaestampa
POSTGRES_USER=casaestampa
POSTGRES_PASSWORD=2558cb606a82d5cab03ab7a4ccca6e23c24c453340f67c5a
DATABASE_URL=postgres://casaestampa:2558cb606a82d5cab03ab7a4ccca6e23c24c453340f67c5a@db:5432/casaestampa
SESSION_SECRET=57aad9bf0a6d309bd095ec609d6fc48412a5278a080823ef3809d3d2f085df1607ae30c26256794226884fa1a6536ca1
ADMIN_USER=admin
ADMIN_PASSWORD=CasaEstampa@10215!
PUBLIC_SITE_URL=https://claudia.codermaster.com.br
UPLOAD_DIR=/app/uploads
COOKIE_SECURE=true
CATALOG_SOURCE_URL=https://casaestampa.com
```

---

## 2. Arquitetura e Onde Estamos

### 2.1 Stack
- **Next 16.2.11 (Turbopack, `output: "standalone"`, `serverActions.bodySizeLimit 25mb`) + React 19.1 + `pg 8.16.3` + `@tabler/icons-react 3.34.1` + `next.config.mjs` com `Cache-Control: private, no-store` para `/admin` e `/api`.
- **Postgres 16-alpine** (volume `claudiasite_site_10215_postgres_data` criado 2026-07-22, **contém a verdade da cliente** — 73 páginas incluindo `home`, `cortinas` 496k, `persianas` 654k, `papeis-de-parede` 88k, `pisos` 38k, `corporativo` 48k, `amorim` 14k, `home-novo` 30k + 60+ álbuns `album-*` com `is_home=false`, `page_type='page'`).
- **Docker:** `docker compose -p claudiasite_site_10215` (não `claudiasite` puro) — `claudiasite_site_10215-web-1:10215->3000` + `claudiasite_site_10215-db-1:5432` (healthy). `casaestampadocker-nextjs-1:3000` e `casaestampadocker-postgres-1:5432` são **outro projeto** (Next 14 + Prisma, `painel.casaestampa.com`), **intacto**.
- **Nginx (aaPanel):** `claudia.codermaster.com.br.conf` `proxy_pass http://127.0.0.1:10215;` `proxy_cache off;` + `extension` vazio, `well-known`. `painel.casaestampa.com.conf` separado.

### 2.2 Fluxo de Dados Atual (pós-correções desta sessão)
```
content/original/*.html  --seed-->  pages (html, original_html)  --getHomePage/getPageBySlug-->  renderHtml(html, settings, {globalHeaderHtml, seo})  -->  Response (text/html, no-store)
                                                          ↑                         ↑
                                                    getSettings()            getHomeHeaderHtml() (extrai nav.navbar do home)
                                                          ↑                         ↑
                                                    settings (global, jsonb)   pages (is_home=true, page_type='page', slug=home)

Editor:  GET /api/pages/:slug + GET /api/settings → useState html/previewCss/catalogSection → iframeHtml = withPublicPreviewCss(html, previewCss) + catalogSection (data-ce-dynamic-catalog) + withEditorBridge(base) → iframe srcDoc
         onSave: postMessage ce-request-html → serialize() remove [data-ce-*], [data-ce-ui], #ce-editor-* → PUT /api/pages/:slug {html, title} → pages.html = novo html cru
         Uploads: POST /api/uploads → /app/uploads/:id + public_path /uploads/...

Catálogo: syncCatalog() → catalog_* → renderCatalogSection() injetado via injectCatalogSection() se html contém <!-- ce-catalog-embed --> ou antes de <footer>, senão nada; guard anti-duplicação class="ce-catalog-embedded" e <!-- ce-catalog-none -->
```

### 2.3 Estado Atual do Banco (2026-08-22 19:30)
- `SELECT slug, is_home FROM pages WHERE is_home=true` → `home|t` (39974 chars após fix, antes 40215 com `</a>` faltando). `home-novo` 30654, `amorim` 14k (não é mais home, mas `lib/source-pages.js:4` ainda tinha `amorim:home:true` até ser corrigido para `home:home:true` nesta sessão).
- `home` `cat-grid` com 5 `a.cat-card` cada `background-image: url("/assets/scraped/...")` + `<span class="cat-veil" style="linear-gradient(rgba(24,20,12,.25), rgba(24,20,12,.82))">` + `cat-card-inner` — **correto** (antes `</a>` faltando fazia `<a>` engolir `atende-sep/porque/cta` e gerar 5 cópias órfãs 821x66 e 914x2069 no DOM).
- `cortinas` 496672 chars, `inst-track` com 9 `carousel-foto` (uploads 2026-08-01) + `mot-videos` 4 `div.mot-video` com `data-ce-bg-video="arquivo"` e `video src="/uploads/2026-07-31/..."` (3 com src válido, 1 com src="" vazio — cliente não preencheu o 4º).
- `persianas` 654049 chars, `mot-videos` 4 `mot-video-ph` com vídeos reais, `fab-grid` 4 `fab-card` (`Amorim`/`Rio Flex`/`Gabriel`/`Coimbra` — `Nitflex` já corrigido para `Coimbra` em `content/original/persianas.html:617` e via `rewritePersianasFabricanteLinks`), `galTrack2` 7 imgs.

---

## 3. O Que Foi Reclamado (Prints) e O Que Já Foi Feito

### 3.1 Lote 1 — WhatsApp (primeiras 2 imagens)
- **“Fotos que coloquei não entraram no carrossel, ficou repetindo. No computador ficou normal.”** + **“Vídeos da motorizada da aba persianas não entraram no app, e no computador não consigo editar vídeos”**
  - **Causa:** `content/original/cortinas.html:809` e `persianas.html:872` IIFE `slides.forEach(cloneNode)` 3× + `scroll reset` + `autoplay 30ms` triplicava 8→24, `window.top!==self` fazia editor não clonar. `persianas` `mot-video-ph` eram `div` placeholder `ti-player-play`, `ElementEditor` só abria para `tag===video`.
  - **Fix:** `lib/db.js:284` `sanitizeLegacyCarouselScripts()` remove IIFEs, clones, scroll reset, autoplay; `lib/db.js:582` CSS `mot-video:has(video) aspect-ratio:16/9`; `app/admin/editor/[slug]/page.js:751` `isVideoSlot=!!closest('.mot-video...')`, `select()` promove para slot, painel **Vídeo do slot (Motorizada)** com `uploadVideoSlot` 80MB/YouTube → `ce-video-slot-set` injeta `<video>`; `lib/db.js:474` `buildGlobalCss` já tinha `mot-video` fix.

### 3.2 Lote 2 — “Ver modelos” (imagem com 4 cards Amorim/Rio Flex/Gabriel/Nitflex)
- **“Quando clica nos álbuns (ver modelos) Amorim, RioFlex… vai pro WhatsApp, mas é pra ir pro álbum de cada coisa como está no site oficial https://casaestampa.com/”**
  - **Causa:** `content/original/persianas.html:617` `fab-grid` com 4 `href="https://api.whatsapp.com/send?phone=5521999886842&text=Quero ver os modelos X"` (Nitflex obsoleto, hoje é Coimbra).
  - **Fix:** `content/original/persianas.html:617` reescrito para `href="/categoria-produto/persianas/amorim-persianas-e-cortinas/"` etc + `Nitflex→Coimbra`; `lib/db.js:332` `rewritePersianasFabricanteLinks()` robusto (regex `api.whatsapp.com[^"]*amorim` → `href="/categoria..."` para qualquer `fab-btn`/`fab-card` já salvo no Postgres) + `rewriteCasaEstampaCategoryLinks()` normaliza `https://casaestampa.com/categoria-produto/...` → `/categoria-produto/...` (papeis com 16 álbuns `album-whisper...` etc).

### 3.3 Lote 3 — “Persianas tbm não entrou as alterações. Os vídeos da motorizada, e os botões: Amorim, RioFlex, Gabriel não estão direcionando pros álbuns.” + Home 3 prints
- **Home “os nomes não parecem nas fotos, tem q mudar todo o estilo”** (grid Papeis/Cortinas/Persianas/Pisos 2x violeta) + **“essa parte tbm está com defeito”** (2×) + último print com `body` `display:flex row` e `cat-card` 10 vs 5, `hero` 153x3190, `categorias` 128x3190 lado-a-lado.
  - **Causa Home:** `home.html` `cat-card` com `background-image` claro atrás de texto `text-light #f5eed8` sem overlay; `buildGlobalCss` sem `::before` para `cat-card`; `cta-final` global `display:flex` sobrescrevia `home.html` `grid 1fr 1fr` com `cta-right` 4 infos; `porque` `carousel-track` `display:grid` vs `ce-global-carousel-track` `display:flex`; ausência de `sanitizeHomeCatCards` deixava `</a>` faltando no 5º card fazendo `<a>` engolir `atende-sep`.
  - **Fix Home:** `lib/db.js:582` `mot-video` + `lib/db.js:589` `categorias .cat-grid .cat-card::before{linear-gradient rgba(18,14,8,0.88→0.18)}` + `text-shadow` + `cat-veil` inline já no DB; `lib/db.js:597` `overflow:hidden` + `cta-final:has(.cta-right){display:grid 1fr 1fr}` + `porque .carousel-track:not(.ce-global...)` grid; `lib/db.js:367` `sanitizeHomeCatCards()` corrige `</a>` faltante e remove `cat-card` órfãos; `lib/db.js:546` `body{display:block; flex-flow:column}` + `body.ce-global...{display:block}` para desfazer `flex row` que `buildGlobalCarouselScript:880` injetava em `body` quando `findTrack` subia até `body` com `scrollWidth>clientWidth`.

### 3.4 Lote 4 — “Não atualizou não” (cortinas carrossel no celular + persianas motorizadas pretas)
- **Cortinas `inst-track` com 47 `inst-slide` (DB 94 string, live 47 DOM) duplicado 5× (1.jpg 4×, 1aaa.jpg 7× etc)**
  - **Causa:** `content/original/cortinas.html` `instTrack` com 8 slides + script clone 3× não removido para `instTrackFlex` (novo `id="instTrackFlex"` com `display:flex` criado pelo editor). `sanitizeLegacyCarouselScripts` só tratava `instTrack|galTrack2|galTrack`, não `instTrackFlex`.
  - **Status:** `lib/db.js:290` atualizado para `(?:instTrack|instTrackFlex|galTrack2|galTrack)` e `DB cortinas` ainda com 94 `inst-slide` (496k) — precisa deduplicar no DB ou via `sanitize` (não feito ainda, cliente ainda vê repetição).
- **Persianas motorizadas pretas** (screenshot 15:11, `mot-videos` preto com setas bege, sem vídeo)
  - **Causa:** `persianas` `mot-videos` 4 `mot-video-ph` com `data-ce-bg-video` e `video src` válido, mas um dos `src=""` vazio em `cortinas` e `persianas` com `background:#000` + `aspect-ratio:16/9` sem `poster` fica preto; no celular `autoplay muted` pode não tocar sem `playsinline`.
  - **Status:** `lib/db.js:582` já tem `mot-video:has(video)` mas screenshot ainda preto — cliente ainda vê cache ou vídeo com `src=""`.

### 3.5 Lote 5 — “Deu uma boa quebrada no css, icones, header, carrosseis que antes eram clicaveis agora nao sao mais” + “ainda continua, ve que tem umas imagens de background ou imagem atras de texto que nao deveriam estar”
- **Causa:** tentativa de fazer drag-and-drop ser 100% verdade removendo `applySiteChrome` e `buildGlobalCss` com `!important` quebrou o site (header sem estilo, ícones sem `tabler-icons`, carrossel sem `ce-global-carousel-track`).
- **Fix revertido:** `lib/db.js:201` `renderHtml` voltou a `replaceGlobalHeader` + `applySiteChrome` + `buildGlobalCss` com `!important` (necessário), mas mantendo `sanitize` e `body` fix. `app/admin/editor/[slug]/page.js:669` `withPublicPreviewCss` voltou a injetar `preview_css` (`buildGlobalCss(settings)`), `iframeHtml` com `previewCss` + `catalogSection` + `withEditorBridge`.

---

## 4. Estado Atual Pós-Último Deploy (2026-08-22 19:29 UTC)

- **Build:** `docker compose -p claudiasite_site_10215 build --no-cache` 23s + `up -d --force-recreate` → `claudiasite_site_10215-web` **Up Less than a second** (imagem `40701aca...`), `claudiasite_site_10215-db-1` **Up 46s (healthy)**, `casaestampadocker-*` **Up 3 days** (intacto).
- **DB `home`:** `is_home=true` = `home` (39974 chars, `cat-grid` 5/5 `</a>` ok, `cat-veil` e `background-image` nos 5 cards), `home-novo` 30654 (template com `href="#"`), `amorim` 14k (catálogo, não mais home), `lib/source-pages.js:4` corrigido para `home:home:true`.
- **Live verificado `curl 127.0.0.1:10215/`:** `200`, `body block` (antes `flex row`), `section` tops `hero 92→categorias 812→atende-sep 1520→porque 1635→faq 2387→cta 3531` empilhados (antes `top 104` para todos), `document.querySelectorAll('.cat-card').length` **5** + `cat-grid .cat-card` **5** + `body.className` **""** (antes **10|5|ce-global...**).
- **Live `curl /persianas | grep -o categoria-produto/persianas`:** **4** (`amorim`, `rio-flex`, `gabriel`, `coimbra`) antes 0.
- **Live `persianas/cortinas` `data-ce-bg-video`:** **4/4** (`video src="/uploads/2026-07-31/..."` visíveis no Playwright), mas 1 `src=""` vazio em `cortinas` ainda preto.
- **Ícones:** `ti` **40** com `fontFamily:tabler-icons` `::before` visíveis (`cat-icon` 115x28 `block`), `cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css` 200 + `woff2` 200.
- **Backups:** `/www/backup/claudiasite_backup_20260822_115011.tar.gz` 1.7G, `claudiasite_backup_20260822_114817.tar.gz` 1.7G, `casaestampadocker_backup_20260822_115011.tar.gz` 9.2M, `/www/backup/db/claudiasite_db_20260822_115011.sql` 17M.

---

## 5. O Que Falta / Próximos Passos para Próxima IA

### 5.1 Pendências Reclamadas que Ainda Precisam de Atenção
1. **Cortinas carrossel imagem repetindo (último print 15:09, `inst-slide` 47 vs 8):** DB `cortinas` com 94 `inst-slide` string (496k) — precisa deduplicar no Postgres (manter 8 únicos por `src`) ou estender `sanitizeLegacyCarouselScripts` para `instTrackFlex` e fazer `renderHtml` deduplicar `inst-slide` por `src` antes de injetar `ce-global-carousel`. `lib/db.js:290` já atualizado para `instTrackFlex`, mas DB ainda com 94.
2. **Home “imagem atrás do texto que não deveria estar”:** ainda há `cat-card` com `background-image` atrás de texto que o cliente não quer? Verificar se `home` `cat-card` com `background-image` + `cat-veil` é desejado ou se deveria ser `background:var(--dark-card)` sólido como `content/original/home.html` sem imagem. Perguntar à cliente qual dos 5 cards deve ter foto e qual deve ser sólido.
3. **Ícones quebrados (cliente disse, mas Playwright mostra 40 ícones ok):** pode ser cache do celular da cliente (hard refresh `Ctrl+Shift+R` ou limpar `proxy_cache_dir` em `/www/wwwroot/claudia.codermaster.com.br/proxy_cache_dir` e `nginx -s reload`). Verificar `tabler-icons.woff2` 200 e `::before` content.
4. **Persianas motorizadas pretas no celular:** `autoplay` sem `poster` fica preto até tocar; adicionar `poster` via `uploadVideoSlot` ou `backgroundImage` `cover` + `poster` input já existe em `ElementEditor` (`page.js:544` `poster`). Cliente precisa re-enviar vídeo com `poster` ou usar `backgroundImage` no slot.
5. ~~**Todas as páginas refletirem drag-and-drop**~~ **RESOLVIDO 2026-08-23:** editor agora tem toggle `Ajustado / Computador (1280px) / Celular (390px)` na toolbar (`app/admin/editor/[slug]/page.js` + `.editor-frame-stage/.editor-frame-device` em `app/admin.css`). ResizeObserver calcula scale e o iframe interno fica com `innerWidth` 1280/390 real — media queries de `buildGlobalCss` respondem corretamente dentro do editor. Verificado em produção: celular 390 = nav none/190px/h1 48px/cta 1col (idêntico ao frontend 390); computador 1280 = nav flex/104px/h1 64px/cta 2col (idêntico ao frontend 1280). Modo padrão continua "Ajustado" (comportamento antigo).

### 5.2 Como Continuar (sem perder nada)
- **Sempre fazer backup antes:** `mkdir -p /www/backup && tar -czf /www/backup/claudiasite_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /www/wwwroot claudiasite && docker exec claudiasite_site_10215-db-1 pg_dump -U casaestampa casaestampa > /www/backup/db/claudiasite_db_$(date +%Y%m%d_%H%M%S).sql` (já existem 2 de 2026-08-22, não sobrescrever).
- **Nunca `docker compose down -v`** (apaga volumes). Usar `docker compose -p claudiasite_site_10215 build --no-cache && docker compose -p claudiasite_site_10215 up -d --force-recreate` (preserva `claudiasite_site_10215_postgres_data` e `uploads`).
- **Não tocar em `casaestampadocker`:** `docker ps` mostra `casaestampadocker-nextjs-1:3000` + `casaestampadocker-postgres-1:5432` com `Up 3 days` — deixar assim.
- **DB é a verdade:** `pages.html` é o que a cliente editou; `content/original/*.html` só é seed inicial (`seedPages()` com `ON CONFLICT DO NOTHING`). Se precisar reverter, `UPDATE pages SET html = original_html WHERE slug='...'`, mas **não** fazer `seed` sem backup.
- **Arquivos chave para editar:**
  - `lib/db.js:201` `renderHtml`, `284` `sanitizeLegacyCarouselScripts`, `323` `rewrite*`, `367` `sanitizeHomeCatCards`, `532` `buildGlobalCss`, `880` `buildGlobalCarouselScript`, `1049` `buildImagePlaceholderScript`
  - `lib/source-pages.js:4` `SOURCE_PAGES`
  - `app/admin/editor/[slug]/page.js:269` `iframeHtml`, `669` `withPublicPreviewCss`, `675` `withEditorBridge` (58 widgets, `carousel`/`gallery`/`video`/`mot-video-ph` + `isVideoSlot`)
  - `content/original/*.html` (se precisar corrigir seed, mas DB já tem edições)
  - `scripts/seed.js`, `scripts/sync-catalog.js` (catálogo WooCommerce)
- **Teste antes de deploy:** `npm run build` local (deve dar `Compiled successfully in 13s`, `18/18` páginas, `Route (app)` com `ƒ /` `ƒ /[slug]` etc) + Playwright `page.goto('https://claudia.codermaster.com.br/')` + `page.goto('/cortinas')` + `page.goto('/persianas')` em 1280 e 390, verificar `document.querySelectorAll('.cat-card').length`, `body.className`, `getComputedStyle`, network 200.
- **Scraping futuro:** usar `CATALOG_SOURCE_URL=https://casaestampa.com` + `scripts/sync-catalog.js` ou `POST /api/catalog/sync` (requer `ce_session` admin) para atualizar `catalog_*` sem mexer em `pages`.

### 5.3 Comandos Úteis no VPS (187.127.44.130 root:CoderMaster2026)
```bash
# Ver logs
docker logs claudiasite_site_10215-web-1 --tail 100
docker logs claudiasite_site_10215-db-1 --tail 50
# Ver páginas
docker exec claudiasite_site_10215-db-1 psql -U casaestampa -d casaestampa -c "SELECT slug, is_home, char_length(html) FROM pages WHERE page_type='page' ORDER BY is_home DESC"
# Ver home
curl -s http://127.0.0.1:10215/ | head -n 200
curl -s http://127.0.0.1:10215/cortinas | grep -o "inst-slide" | wc -l
# Limpar cache nginx se cliente ainda vê antigo
rm -rf /www/wwwroot/claudia.codermaster.com.br/proxy_cache_dir/* && nginx -s reload
```

---

## 6. Checklist para Próxima Sessão

- [ ] Cliente fez hard refresh no celular? (`Ctrl+Shift+R` ou limpar cache do `claudia.codermaster.com.br` em Configurações > Privacidade)
- [ ] `cortinas` `inst-slide` deduplicado para 8 únicos (remover 47-8=39 duplicatas no `pages.html` onde `slug='cortinas'`)
- [ ] `home` `cat-card` com `background-image` atrás de texto — cliente quer manter ou voltar para `background:var(--dark-card)` sólido? Perguntar.
- [ ] `persianas` último slot `src=""` preenchido com vídeo real ou `poster`
- [x] Todas as páginas testadas em Playwright 1280/390 vs editor iframe — **RESOLVIDO 2026-08-23** com toggle Ajustado/Computador/Celular no editor (deploy verificado)
- [ ] `casaestampa.com` scraping de novas imagens: `scripts/sync-catalog.js` + `catalog:sync` ainda funciona com `x-wp-totalpages`?

---

## 7. Histórico de Alterações desta Sessão (para `git log`)

### Sessão 2026-08-24 (madrugada) — arquitetos-designers no celular
- **Reclamação:** página toda fora do enquadro no celular; foto de fundo do hero e fotos do Morar Mais só aparecem no PC; colocar vídeo da Suellen; +3 espaços de foto
- **Vídeo Suellen:** já estava na página (`/uploads/2026-07-29/1785286898736...mp4`, slot "Projeto Servi Promo") — não tocava no iPhone pelo bug do Range (já corrigido). Os outros 4 slots de vídeo são placeholders vazios por design (editáveis)
- **Fotos Morar Mais:** 9 slots `.mostra-foto-ph` com background-image (JPEGs válidos) — não apareciam no iPhone provavelmente pelo mesmo deploy antigo sem Content-Type na rota /uploads (corrigido)
- **Layout (causa real do "fora do enquadro"):** o CSS embutido da página não tem NENHUMA @media query — grids `1fr 1fr`/`repeat(4,1fr)` não colapsavam (quem-somos, mostra-intro, mostra-fotos, ben-grid, vid-grid, clube, clube-right, cadastro/form-grid)
- **Fix no DB (backups em /www/backup/pages/arquitetos-designers_antes_*.html):** `<style id="ce-arq-responsive">` com @media 900px/560px colapsando todos os grids + `.cadastro`/`.form-grid`/`.form-input` full-width + **3 slots novos** `.mostra-foto` vazios (editáveis) no fim do grid
- **Verificado (Playwright 390/1280):** mobile sem scroll horizontal, todos grids 1-2 col, hero bg renderiza, 12 slots de foto (9 fotos + 3 vazios), vídeo Suellen presente; desktop intacto (2/4/4/2 colunas)

### Sessão 2026-08-23 (noite 6) — CAUSA RAIZ dos vídeos pretos no iPhone
- **Sintoma persistente:** vídeos tocando no PC mas pretos no iPhone, mesmo após playsinline/muted/fallback de controles
- **Causa raiz real:** `app/uploads/[...path]/route.js` não suportava HTTP Range — respondia 200 com o arquivo inteiro. **Safari/iOS exige 206 Partial Content + Accept-Ranges para vídeo inline**; sem isso fica preto. Chrome/PC tolera (por isso "no computador funciona")
- **Fix:** rota reescrita com Range completo (206, Content-Range, Accept-Ranges, 416 para range inválido), Content-Type correto por extensão (vídeo/áudio/imagem), leitura parcial do arquivo sem carregar tudo
- **Verificado:** `curl -H "Range: bytes=0-1023"` → 206 + `content-range: bytes 0-1023/3274066` + `video/mp4`; sem Range → 200 + accept-ranges
- Arquivos dos vídeos são os mesmos que a cliente reenviou por WhatsApp (tamanhos batem com /uploads/2026-07-31) — H.264 ok, sem problema de codec

### Sessão 2026-08-23 (noite 5) — Setas no modelo + auditoria de sincronia
- **Pedido 6 (setas):** `app/produto/[slug]/route.js` busca vizinhos na categoria mais específica do produto (`listCatalogProducts` perPage 100000, índice ±1); `renderProductPage` ganhou `prev`/`next` — setas circulares douradas `.ce-product-nav` sobre a imagem (tabler chevrons). Verificado: Elegancy 161 → prev 128 / next 162; 162 → next 170
- **Pedido 7 (modelos faltando):** auditoria completa origem↔local — **0 categorias ausentes**, mesmos 5 filhos da Amorim, contagens locais ≥ API pública (Rolo COM 127 local vs 110 API — produtos em múltiplas categorias). O que a cliente vê "a mais" no wp-admin são produtos **ocultos/rascunho** no próprio WP (API pública não expõe). 25 produtos ativos sem categoria nenhuma (órfãos do WP). Se ela quiser ver os ocultos: marcá-los como visíveis no WP e rerodar sync (agora à prova de slug duplicado), ou fornecer credenciais de API admin
- 6298 produtos ativos sincronizados

### Sessão 2026-08-23 (noite 4) — Stillo + subcategorias + sem paginação
- **Stillo (pedido 3):** álbum não existia no catálogo local (última sync 02/08); existia na origem (id 270, parent 34=Amorim). Sync falhava com `catalog_products_slug_key` (slug duplicado entre source_ids diferentes)
- `lib/catalog.js`: antes de cada upsert de categoria/produto, remover linha de OUTRO source_id que esteja usando o mesmo slug (slug é unique key). Sync reexecutada: **182 categorias e 6270 produtos**; Stillo entrou com 49 produtos; Rolo Romana COM 53→110, SEM 37→76 (origem atualizada)
- **Pedido 4 (subcategorias):** o fix do hero (sem breadcrumb/kicker, quadro menor) já era no template compartilhado `renderCategoryPage` — vale para todas; verificado em Rolo Romana COM: 0 breadcrumbs, 0 kickers, hero 290px
- **Pedido 5 (paginação):** `app/categoria-produto/[...path]/route.js` agora chama `listCatalogProducts({ perPage: 100000 })` — todos os produtos numa página só; `ce-pagination` não renderiza (só aparece com >1 página). Verificado: Rolo Romana COM com 127 produtos numa página, 0 paginação

### Sessão 2026-08-23 (noite 3) — Hero das páginas de categoria
- **Pedido da cliente (print Amorim):** tirar "CATÁLOGO / PERSIANAS / ..." e "CASA ESTAMPA" do topo, deixar só o nome; e diminuir o quadro escuro que ocupava a página toda
- `lib/catalog-html.js` `renderCategoryPage`: removidos `<nav class="ce-breadcrumb">` e `<p>CASA ESTAMPA</p>` do hero (fica só `<h1>` + descrição opcional)
- `lib/catalog-html.js` `catalogStyles()`: `.ce-category-hero` desktop `min-height 520→290px` (padding 112/62), mobile `430→210px` (padding 96/48) + `h1 34px` no mobile
- Vale para TODAS as categorias (Amorim, Rio Flex, Gabriel, Coimbra etc. — verificado 200 e sem breadcrumb); `/catalogo` e páginas de produto intocados
- Screenshot de referência: `amorim-hero-corrigido-390.png`

### Sessão 2026-08-23 (noite 2) — Vídeos invisíveis no celular da cliente
- **Reclamação 14:16:** "vídeos das motorizadas não aparecem no celular, só no computador" (anterior ao fix de layout de 18h)
- **Descartado:** MP4s OK (átomo moov no início, streaming iOS funciona); atributos autoplay/muted/playsinline já corretos
- **Causa provável:** iOS Low Power Mode / economia de dados bloqueia autoplay → vídeo fica preto sem controles = "não aparece"
- **Fix:** `lib/db.js` `buildMotVideoScript()` injetado quando a página tem `.mot-video` — tenta dar play; se o navegador bloquear (promise rejeitada, paused após 3,5s ou erro), ativa `controls` para tocar com um toque. Nada muda visualmente quando o autoplay funciona
- Nginx `proxy_cache_dir` limpo + reload
- **Verificado:** persianas 4/4 tocando, empilhados; cortinas 3/3 tocando, empilhados; fonte e carrossel de fotos intactos

### Sessão 2026-08-23 (noite) — Vídeos motorizados padronizados (persianas = cortinas)
- **Reclamação da cliente:** cortinas mostra vídeos empilhados, persianas mostra carrossel com setas — "deixar as 2 com um vídeo embaixo do outro como em cortinas"
- **Causa:** persianas tinha 2 botões `ce-mot-arrow` hardcoded no DB + wrap com `display:grid 2col + cursor:grab` inline + `<style id="ce-mot-grid-fix">` no BODY com `.mot-videos.ce-exact-node > .elementor-widget-wrap{display:flex!important}`; o script global de carrossel também convertia o wrap (overflow) em trilho flex
- **DB persianas:** backup prévio (`/www/backup/pages/persianas_antes_videos_*.html`), removidos os 2 botões e trocado inline grid 2col→1fr
- `lib/db.js` buildGlobalCarouselScript: `initialize()` agora ignora tracks dentro de `.mot-videos` (como já fazia com `.porque`)
- `lib/db.js` buildGlobalCss: `.mot-videos .elementor-widget-wrap` forçado a `grid repeat(2,1fr)` no desktop e `1fr` ≤768px (mesmo padrão visual da cortinas), com seletores de especificidade (0,3,0) para vencer o `ce-mot-grid-fix` embarcado
- `app/admin/editor/[slug]/page.js` `withPublicPreviewCss`: previewCss agora injetado antes de `</body>` (não `</head>`) — espelha o frontend e garante que estilos globais vençam `<style>` embarcado no body da página (afeta todas as páginas no editor)
- **Verificado (Playwright):** persianas 390 = 4 vídeos empilhados 1 coluna, 0 setas, sem scroll horizontal; persianas 1280 = grid 2×2 (igual cortinas desktop); editor Ajustado = grid 2 linhas, 0 setas; cortinas intocada (47 slides do carrossel de fotos continuam funcionando)

### Sessão 2026-08-23 (tarde) — Imagens repetidas/escondidas + ícones quebrados
- **Causa raiz das "imagens repetidas/divergentes" na cortinas:** as ~30 fotos reais enviadas pela cliente (`/uploads/whatsapp-image...`) foram empilhadas DEPOIS do placeholder `<img>` antigo (ex: `4.jpg`) dentro dos `.elementor-icon-wrapper` — a foto dela ficava escondida atrás e o placeholder genérico aparecia repetido em dezenas de slides. Além disso, cada slide tem a foto real como **background da coluna** `.inst-ph`, e o `<img>` placeholder cobria.
- `lib/html-utils.js` (NOVO): `normalizeIconFont`, `dedupeStackedImages`, `removeEmptyVideos` — puro, sem deps, importável no client
- `lib/db.js` renderHtml: pipeline agora roda `dedupeStackedImages` + `removeEmptyVideos`; tabler CDN substituído por **fonte self-hosted** `/assets/fonts/tabler-icons.min.css` (+ woff2/woff em `public/assets/fonts/`, v3.35.0) — zero dependência do jsdelivr, sem drift de `@latest`
- `lib/db.js` buildGlobalCss: regra `.inst-ph[style*="background-image"] .elementor-icon-wrapper img{display:none!important}` — background real sempre ganha do placeholder
- `app/admin/editor/[slug]/page.js`: iframe do editor também normaliza a fonte (ícones ok nas 3 versões)
- DB cortinas: UPDATE cirúrgico (backup prévio em `/www/backup/pages/cortinas_antes_fix_20260823_154658.html`) → 110→68 imgs, 1 vídeo `src=""` removido
- **Verificado pós-deploy (Playwright):** cortinas 47/47 fotos únicas visíveis; home/persianas/papeis-de-parede/pisos/corporativo/amorim = 0 imagens quebradas, 0 scroll horizontal, fonte carregada, vídeos motorizada 4/4 com src; editor Celular(390)/Computador(1280)/Ajustado idênticos ao frontend
- Persianas/corporativo têm imgs repetidas LEGÍTIMAS (mesma foto em seções diferentes — design, não bug)

### Sessão 2026-08-23 (manhã) — Toggle Desktop/Celular no editor (WYSIWYG real)
- `app/admin/editor/[slug]/page.js`: estado `device` (`fit|desktop|mobile`) + `frameBox` via `ResizeObserver`; toggle na toolbar (ícones `IconResize`/`IconDeviceDesktop`/`IconDeviceMobile`); em modo desktop/mobile o iframe interno recebe `width:1280/390px` com `transform:scale()` calculado para caber no painel — media queries respondem à largura simulada
- `app/admin.css`: `.editor-frame-stage`, `.editor-frame-device`, `.device-toggle` (mobile com borda arredondada)
- `lib/db.js` deployado com fix pendente `instTrackFlex` no regex de `sanitizeLegacyCarouselScripts` (já estava no local, faltava produção)
- Deploy: hashes comparados local↔VPS antes do scp (local era superconjunto; nenhuma perda); backup `/www/backup/claudiasite_backup_20260823_114200.tar.gz` (1.7G) + `db/claudiasite_db_20260823_114200.sql` (17M); `build --no-cache` (71s) + `up -d --force-recreate`; `casaestampadocker-*` intacto (Up 4 days)
- Verificado: `/` e `/cortinas` e `/persianas` 200; editor modo Celular = medições idênticas ao frontend 390; modo Computador = idêntico ao frontend 1280
- **Pendência herdada:** dedupe dos 94→8 `inst-slide` no DB `cortinas` continua aberto (item 5.1.1)

### Sessão anterior (2026-08-22)
- `lib/db.js:284` `sanitizeLegacyCarouselScripts` cobre `instTrackFlex` + `instTrack|galTrack2|galTrack` → `/* ce-legacy removed */`
- `lib/db.js:367` `sanitizeHomeCatCards` (fecha `</a>` faltante, remove `cat-card` órfão fora do grid, unwrap `a` que engloba `atende-sep`/`cta-bg-word`)
- `lib/db.js:546` `body{display:block; flex-flow:column; overflow:visible; overflow-x:clip}` + `body.ce-global...{display:block}` para desfazer `flex row` que `buildGlobalCarouselScript` injetava em `body`
- `lib/db.js:589` `cat-card::before linear-gradient` + `text-shadow` para legibilidade atrás de `background-image`
- `lib/db.js:597` `overflow:hidden` + `cta-final:has(.cta-right){display:grid}` + `porque .carousel-track:not(.ce-global...)` grid
- `lib/db.js:332` `rewritePersianasFabricanteLinks` + `rewriteCasaEstampaCategoryLinks`
- `content/original/persianas.html:617` `Nitflex→Coimbra` + `href` para `/categoria-produto/persianas/...`
- `lib/source-pages.js:4` `home:true` de `amorim` → `home`
- `app/admin/editor/[slug]/page.js:669` `withPublicPreviewCss` no-op + `iframeHtml` sem `previewCss` + `isVideoSlot` + `uploadVideoSlot` 80MB + `ce-video-slot-set` + `labelOf` “Vídeo motorizada”
- `lib/db.js:201` `renderHtml` temporariamente minimal (sem `applySiteChrome`/`buildGlobalCss`) e depois revertido para com `buildGlobalCss` mas mantendo drag-and-drop como verdade via `sanitize` + `body` fix
- VPS: 3× `docker compose -p claudiasite_site_10215 build --no-cache` (23s, 72s) + `up -d --force-recreate`, backups em `/www/backup/` e `/www/backup/db/`, `docker ps` com `Up Less than a second` verificado via Playwright 1280/390

---

## 8. Contatos e Próximos Passos Sugeridos

- Cliente se baseia no **carrossel das cortinas no celular** para validar — sempre testar `https://claudia.codermaster.com.br/cortinas` em 390px após cada deploy.
- Vídeos motorizados: orientar cliente a usar **slot** `mot-video-ph` (persianas) ou `mot-video` (cortinas) → clicar no placeholder → **Enviar video** (mp4, até 80MB, `playsinline`) ou colar YouTube → **Salvar**.
- Para próxima IA: **não** fazer `seed` sem backup, **não** `down -v`, **não** tocar em `casaestampadocker`, sempre `build --no-cache` e `up -d --force-recreate` com `-p claudiasite_site_10215`.

