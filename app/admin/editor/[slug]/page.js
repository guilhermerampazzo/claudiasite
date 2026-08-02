"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  IconAdjustments,
  IconArrowBackUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconBox,
  IconCarouselHorizontal,
  IconChevronDown,
  IconCode,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconHeading,
  IconLayoutColumns,
  IconLayoutGrid,
  IconLayoutNavbar,
  IconLink,
  IconList,
  IconPhoto,
  IconPlayerPlay,
  IconQuote,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTypography
} from "@tabler/icons-react";
import { GOOGLE_FONTS, TABLER_ICONS } from "@/lib/editor-options";

const widgetGroups = [
  {
    label: "Estrutura",
    items: [
      { type: "section", label: "Secao", icon: IconLayoutNavbar },
      { type: "container", label: "Container", icon: IconBox },
      { type: "columns", label: "2 colunas", icon: IconLayoutColumns },
      { type: "row", label: "Linha", icon: IconLayoutColumns },
      { type: "columns3", label: "3 colunas", icon: IconLayoutGrid },
      { type: "columns4", label: "4 colunas", icon: IconLayoutGrid },
      { type: "grid", label: "Grade flexivel", icon: IconLayoutGrid },
      { type: "inner-section", label: "Secao interna", icon: IconBox }
    ]
  },
  {
    label: "Texto",
    items: [
      { type: "title", label: "Titulo", icon: IconHeading },
      { type: "subtitle", label: "Subtitulo", icon: IconHeading },
      { type: "text", label: "Texto", icon: IconTypography },
      { type: "quote", label: "Citacao", icon: IconQuote },
      { type: "list", label: "Lista", icon: IconList },
      { type: "icon-list", label: "Lista com icones", icon: IconList },
      { type: "badge", label: "Etiqueta", icon: IconTypography },
      { type: "divider", label: "Divisor", icon: IconTypography },
      { type: "spacer", label: "Espacador", icon: IconAdjustments },
      { type: "icon", label: "Icone", icon: IconAdjustments }
    ]
  },
  {
    label: "Midia",
    items: [
      { type: "image", label: "Imagem", icon: IconPhoto },
      { type: "carousel", label: "Carrossel (linha horizontal)", icon: IconCarouselHorizontal },
      { type: "gallery", label: "Galeria (grade vertical)", icon: IconLayoutGrid },
      { type: "video", label: "Video", icon: IconPlayerPlay },
      { type: "audio", label: "Audio", icon: IconPlayerPlay },
      { type: "before-after", label: "Antes e depois", icon: IconPhoto }
    ]
  },
  {
    label: "Interativos",
    items: [
      { type: "button", label: "Botao", icon: IconLink },
      { type: "accordion", label: "Sanfona", icon: IconList },
      { type: "tabs", label: "Abas", icon: IconLayoutColumns },
      { type: "counter", label: "Contador", icon: IconTypography },
      { type: "progress", label: "Progresso", icon: IconAdjustments },
      { type: "testimonial", label: "Depoimento", icon: IconQuote },
      { type: "card", label: "Card", icon: IconBox },
      { type: "pricing", label: "Preco", icon: IconBox },
      { type: "alert", label: "Aviso", icon: IconAdjustments }
    ]
  },
  {
    label: "Contato e negocio",
    items: [
      { type: "contact-card", label: "Contato", icon: IconBox },
      { type: "whatsapp", label: "WhatsApp", icon: IconLink },
      { type: "phone", label: "Telefone", icon: IconLink },
      { type: "form", label: "Formulario", icon: IconTypography },
      { type: "map", label: "Mapa", icon: IconPhoto }
    ]
  },
  {
    label: "Marketing",
    items: [
      { type: "hero", label: "Hero", icon: IconLayoutNavbar },
      { type: "cta", label: "Chamada para acao", icon: IconLink },
      { type: "newsletter", label: "Newsletter", icon: IconTypography },
      { type: "countdown", label: "Contagem regressiva", icon: IconAdjustments },
      { type: "popup-trigger", label: "Acionador de popup", icon: IconLink }
    ]
  },
  {
    label: "Conteudo avancado",
    items: [
      { type: "image-box", label: "Caixa com imagem", icon: IconPhoto },
      { type: "team", label: "Membro da equipe", icon: IconPhoto },
      { type: "logos", label: "Logos de clientes", icon: IconLayoutGrid },
      { type: "timeline", label: "Linha do tempo", icon: IconList },
      { type: "stats", label: "Estatisticas", icon: IconLayoutGrid },
      { type: "faq", label: "FAQ", icon: IconList },
      { type: "table", label: "Tabela", icon: IconLayoutGrid },
      { type: "comparison", label: "Comparacao", icon: IconLayoutColumns },
      { type: "products", label: "Grade de produtos", icon: IconLayoutGrid },
      { type: "portfolio", label: "Portfolio", icon: IconLayoutGrid }
    ]
  },
  {
    label: "Navegacao e social",
    items: [
      { type: "search-box", label: "Campo de busca", icon: IconSearch },
      { type: "breadcrumbs", label: "Caminho da pagina", icon: IconLink },
      { type: "social-icons", label: "Redes sociais", icon: IconLink },
      { type: "share", label: "Compartilhar", icon: IconLink },
      { type: "embed", label: "Embed externo", icon: IconCode }
    ]
  }
];

const widgetTemplates = {
  section: '<section data-ce-kind="section" data-ce-label="Nova secao" style="padding:48px 24px;min-height:140px;"><div data-ce-kind="container" data-ce-label="Container da secao" style="display:flex;flex-direction:column;gap:16px;width:min(1200px,100%);margin:0 auto;min-height:80px;"><h2 data-ce-widget="title">Novo titulo</h2><p data-ce-widget="text">Escreva aqui o conteudo da nova secao.</p></div></section>',
  container: '<div data-ce-kind="container" data-ce-label="Novo container" style="display:flex;flex-direction:column;gap:16px;padding:24px;min-height:96px;flex:1 1 0;"></div>',
  columns: '<div data-ce-kind="container" data-ce-label="Duas colunas" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:24px;min-height:120px;"><div data-ce-kind="container" data-ce-label="Coluna 1" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 2" style="min-height:88px;"></div></div>',
  row: '<div data-ce-kind="container" data-ce-label="Linha de containers" style="display:flex;flex-direction:row;flex-wrap:wrap;align-items:stretch;gap:24px;padding:24px;min-height:120px;"><div data-ce-kind="container" data-ce-label="Container 1" style="flex:1 1 260px;min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Container 2" style="flex:1 1 260px;min-height:88px;"></div></div>',
  columns3: '<div data-ce-kind="container" data-ce-label="Tres colunas" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding:24px;min-height:120px;"><div data-ce-kind="container" data-ce-label="Coluna 1" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 2" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 3" style="min-height:88px;"></div></div>',
  columns4: '<div data-ce-kind="container" data-ce-label="Quatro colunas" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:24px;min-height:120px;"><div data-ce-kind="container" data-ce-label="Coluna 1" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 2" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 3" style="min-height:88px;"></div><div data-ce-kind="container" data-ce-label="Coluna 4" style="min-height:88px;"></div></div>',
  grid: '<div data-ce-kind="container" data-ce-label="Grade flexivel" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;padding:24px;min-height:120px;"><div data-ce-kind="container" style="min-height:88px;"></div><div data-ce-kind="container" style="min-height:88px;"></div><div data-ce-kind="container" style="min-height:88px;"></div></div>',
  "inner-section": '<section data-ce-kind="section" data-ce-label="Secao interna" style="padding:32px;min-height:120px;"><div data-ce-kind="container" style="display:flex;flex-direction:column;gap:16px;min-height:80px;"></div></section>',
  title: '<h2 data-ce-widget="title" style="margin:0 0 16px;">Novo titulo</h2>',
  subtitle: '<h3 data-ce-widget="subtitle" style="margin:0 0 12px;">Novo subtitulo</h3>',
  text: '<p data-ce-widget="text" style="margin:0 0 16px;line-height:1.7;">Escreva aqui o novo texto da pagina.</p>',
  quote: '<blockquote data-ce-widget="quote" style="margin:0;padding:8px 0 8px 24px;border-left:3px solid currentColor;font-size:1.25em;line-height:1.6;"><p style="margin:0;">Uma frase marcante para destacar.</p><cite style="display:block;margin-top:10px;font-size:.75em;">Nome do autor</cite></blockquote>',
  list: '<ul data-ce-widget="list" style="margin:0;padding-left:24px;line-height:1.8;"><li>Primeiro item</li><li>Segundo item</li><li>Terceiro item</li></ul>',
  "icon-list": '<ul data-ce-widget="icon-list" style="display:grid;gap:10px;margin:0;padding:0;list-style:none;"><li>&#10003; Primeiro beneficio</li><li>&#10003; Segundo beneficio</li><li>&#10003; Terceiro beneficio</li></ul>',
  badge: '<span data-ce-widget="badge" style="display:inline-flex;padding:6px 10px;border:1px solid currentColor;border-radius:999px;font-size:12px;text-transform:uppercase;">Destaque</span>',
  divider: '<hr data-ce-widget="divider" style="width:100%;margin:24px 0;border:0;border-top:1px solid currentColor;opacity:.35;" />',
  spacer: '<div data-ce-widget="spacer" data-ce-label="Espacador" style="height:64px;width:100%;"></div>',
  icon: '<i data-ce-widget="icon" data-ce-label="Icone" class="ti ti-star" aria-hidden="true" style="display:inline-block;font-size:42px;line-height:1;"></i>',
  image: '<img data-ce-widget="image" src="/assets/logo-letra.svg" alt="" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover;" />',
  carousel: '<div data-ce-widget="carousel" data-ce-label="Carrossel de imagens" style="display:flex;gap:16px;width:100%;overflow-x:auto;scroll-behavior:smooth;"><img src="/assets/logo-letra.svg" alt="" style="display:block;flex:0 0 min(320px,80vw);width:min(320px,80vw);aspect-ratio:4/3;object-fit:cover;" /><img src="/assets/logo-letra.svg" alt="" style="display:block;flex:0 0 min(320px,80vw);width:min(320px,80vw);aspect-ratio:4/3;object-fit:cover;" /><img src="/assets/logo-letra.svg" alt="" style="display:block;flex:0 0 min(320px,80vw);width:min(320px,80vw);aspect-ratio:4/3;object-fit:cover;" /></div>',
  gallery: '<div data-ce-widget="gallery" data-ce-label="Galeria (grade vertical)" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;" /><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;" /><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;" /><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;" /></div>',
  video: '<video data-ce-widget="video" controls poster="/assets/logo-letra.svg" style="display:block;width:100%;min-height:240px;border:1px solid currentColor;object-fit:contain;"><source src="" type="video/mp4" />Seu navegador nao suporta video.</video>',
  audio: '<audio data-ce-widget="audio" controls style="display:block;width:100%;"><source src="" type="audio/mpeg" />Seu navegador nao suporta audio.</audio>',
  "before-after": '<div data-ce-widget="before-after" data-ce-label="Antes e depois" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;"><figure style="margin:0;"><img src="/assets/logo-letra.svg" alt="Antes" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><figcaption>Antes</figcaption></figure><figure style="margin:0;"><img src="/assets/logo-letra.svg" alt="Depois" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><figcaption>Depois</figcaption></figure></div>',
  button: '<a data-ce-widget="button" href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:1px solid currentColor;background:transparent;color:inherit;text-decoration:none;">Texto do botao</a>',
  accordion: '<div data-ce-widget="accordion" data-ce-label="Sanfona" style="display:grid;gap:8px;"><details open style="border-bottom:1px solid currentColor;padding:12px 0;"><summary style="cursor:pointer;font-weight:700;">Primeira pergunta</summary><p>Resposta da primeira pergunta.</p></details><details style="border-bottom:1px solid currentColor;padding:12px 0;"><summary style="cursor:pointer;font-weight:700;">Segunda pergunta</summary><p>Resposta da segunda pergunta.</p></details></div>',
  tabs: '<div data-ce-widget="tabs" data-ce-label="Abas"><div style="display:flex;gap:8px;border-bottom:1px solid currentColor;"><button type="button" style="padding:10px 14px;border:0;border-bottom:2px solid currentColor;background:transparent;color:inherit;">Aba 1</button><button type="button" style="padding:10px 14px;border:0;background:transparent;color:inherit;">Aba 2</button></div><div style="padding:20px 0;">Conteudo da primeira aba.</div></div>',
  counter: '<div data-ce-widget="counter" style="text-align:center;"><strong style="display:block;font-size:52px;line-height:1;">250+</strong><span>Projetos realizados</span></div>',
  progress: '<div data-ce-widget="progress" style="width:100%;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Progresso</span><span>75%</span></div><div style="height:8px;border:1px solid currentColor;"><div style="width:75%;height:100%;background:currentColor;"></div></div></div>',
  testimonial: '<figure data-ce-widget="testimonial" style="margin:0;padding:24px;border:1px solid currentColor;"><blockquote style="margin:0 0 16px;font-size:1.15em;line-height:1.6;">O atendimento foi excelente e o resultado ficou lindo.</blockquote><figcaption><strong>Nome da cliente</strong><br /><span>Rio de Janeiro</span></figcaption></figure>',
  card: '<article data-ce-widget="card" style="display:grid;gap:16px;padding:24px;border:1px solid currentColor;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:16/9;object-fit:contain;" /><h3 style="margin:0;">Titulo do card</h3><p style="margin:0;line-height:1.6;">Descricao curta do conteudo.</p><a href="#" style="color:inherit;">Saiba mais</a></article>',
  pricing: '<article data-ce-widget="pricing" style="display:grid;gap:14px;padding:28px;border:1px solid currentColor;text-align:center;"><h3 style="margin:0;">Plano personalizado</h3><strong style="font-size:38px;">R$ 0</strong><p style="margin:0;">Descricao do produto ou servico.</p><a href="#" style="display:inline-flex;justify-content:center;padding:12px;border:1px solid currentColor;color:inherit;text-decoration:none;">Solicitar</a></article>',
  alert: '<div data-ce-widget="alert" role="status" style="padding:16px 20px;border:1px solid currentColor;border-left-width:4px;"><strong>Aviso:</strong> escreva aqui uma informacao importante.</div>',
  "contact-card": '<address data-ce-widget="contact-card" style="display:grid;gap:10px;padding:24px;border:1px solid currentColor;font-style:normal;"><strong>Casa Estampa Interiores</strong><a href="tel:+5521999886842" style="color:inherit;">(21) 99988-6842</a><a href="mailto:contato@casaestampa.com" style="color:inherit;">contato@casaestampa.com</a><span>Rio de Janeiro - RJ</span></address>',
  whatsapp: '<a data-ce-widget="whatsapp" href="https://api.whatsapp.com/send?phone=5521999886842" style="display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border:1px solid currentColor;background:transparent;color:inherit;text-decoration:none;">Falar pelo WhatsApp</a>',
  phone: '<a data-ce-widget="phone" href="tel:+5521999886842" style="display:inline-flex;align-items:center;gap:10px;color:inherit;text-decoration:none;">Ligar: (21) 99988-6842</a>',
  form: '<form data-ce-widget="form" style="display:grid;gap:14px;width:100%;"><label style="display:grid;gap:6px;">Nome<input type="text" name="nome" style="padding:12px;border:1px solid currentColor;background:transparent;color:inherit;" /></label><label style="display:grid;gap:6px;">E-mail<input type="email" name="email" style="padding:12px;border:1px solid currentColor;background:transparent;color:inherit;" /></label><label style="display:grid;gap:6px;">Mensagem<textarea name="mensagem" rows="4" style="padding:12px;border:1px solid currentColor;background:transparent;color:inherit;"></textarea></label><button type="submit" style="padding:12px 18px;border:1px solid currentColor;background:transparent;color:inherit;">Enviar</button></form>',
  map: '<iframe data-ce-widget="map" title="Mapa" src="https://www.openstreetmap.org/export/embed.html?bbox=-43.4%2C-23.1%2C-43.1%2C-22.8&amp;layer=mapnik" style="display:block;width:100%;height:360px;border:1px solid currentColor;"></iframe>',
  hero: '<section data-ce-widget="hero" data-ce-kind="section" data-ce-label="Hero" style="display:grid;align-content:center;min-height:520px;padding:64px 7%;"><div data-ce-kind="container" style="display:grid;gap:18px;max-width:760px;"><span style="text-transform:uppercase;">Casa Estampa</span><h1 style="margin:0;font-size:56px;line-height:1.05;">Titulo principal da pagina</h1><p style="margin:0;font-size:18px;line-height:1.7;">Uma descricao clara para apresentar esta pagina.</p><a href="#" style="justify-self:start;padding:13px 20px;border:1px solid currentColor;color:inherit;text-decoration:none;">Conhecer</a></div></section>',
  cta: '<section data-ce-widget="cta" data-ce-label="Chamada para acao" style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:36px;border:1px solid currentColor;"><div><h2 style="margin:0 0 8px;">Pronta para transformar seu ambiente?</h2><p style="margin:0;">Fale com nossa equipe especializada.</p></div><a href="#" style="flex:0 0 auto;padding:13px 20px;border:1px solid currentColor;color:inherit;text-decoration:none;">Falar agora</a></section>',
  newsletter: '<form data-ce-widget="newsletter" data-ce-label="Newsletter" style="display:grid;gap:14px;padding:28px;border:1px solid currentColor;"><h3 style="margin:0;">Receba novidades</h3><p style="margin:0;">Cadastre seu e-mail para acompanhar lancamentos.</p><div style="display:flex;gap:8px;"><input type="email" placeholder="Seu melhor e-mail" style="flex:1;padding:12px;border:1px solid currentColor;background:transparent;color:inherit;" /><button type="submit" style="padding:12px 18px;border:1px solid currentColor;background:transparent;color:inherit;">Cadastrar</button></div></form>',
  countdown: '<div data-ce-widget="countdown" data-ce-label="Contagem regressiva" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;text-align:center;"><div><strong style="display:block;font-size:36px;">07</strong><span>Dias</span></div><div><strong style="display:block;font-size:36px;">12</strong><span>Horas</span></div><div><strong style="display:block;font-size:36px;">45</strong><span>Minutos</span></div><div><strong style="display:block;font-size:36px;">30</strong><span>Segundos</span></div></div>',
  "popup-trigger": '<button data-ce-widget="popup-trigger" type="button" style="padding:13px 20px;border:1px solid currentColor;background:transparent;color:inherit;">Abrir informacoes</button>',
  "image-box": '<article data-ce-widget="image-box" style="display:grid;grid-template-columns:minmax(180px,40%) minmax(0,1fr);gap:24px;align-items:center;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><div><h3 style="margin:0 0 10px;">Titulo da imagem</h3><p style="margin:0;line-height:1.6;">Descricao relacionada a imagem.</p></div></article>',
  team: '<article data-ce-widget="team" style="display:grid;gap:12px;text-align:center;"><img src="/assets/logo-icone.svg" alt="Profissional" style="width:100%;aspect-ratio:1;object-fit:contain;border:1px solid currentColor;" /><h3 style="margin:0;">Nome da profissional</h3><p style="margin:0;">Especialidade</p></article>',
  logos: '<div data-ce-widget="logos" data-ce-label="Logos de clientes" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;align-items:center;"><img src="/assets/logo-letra.svg" alt="Cliente 1" style="width:100%;height:70px;object-fit:contain;" /><img src="/assets/logo-letra.svg" alt="Cliente 2" style="width:100%;height:70px;object-fit:contain;" /><img src="/assets/logo-letra.svg" alt="Cliente 3" style="width:100%;height:70px;object-fit:contain;" /><img src="/assets/logo-letra.svg" alt="Cliente 4" style="width:100%;height:70px;object-fit:contain;" /></div>',
  timeline: '<ol data-ce-widget="timeline" style="display:grid;gap:20px;margin:0;padding:0;list-style:none;"><li style="display:grid;grid-template-columns:42px 1fr;gap:14px;"><strong>01</strong><div><h3 style="margin:0 0 6px;">Primeira etapa</h3><p style="margin:0;">Descricao desta etapa.</p></div></li><li style="display:grid;grid-template-columns:42px 1fr;gap:14px;"><strong>02</strong><div><h3 style="margin:0 0 6px;">Segunda etapa</h3><p style="margin:0;">Descricao desta etapa.</p></div></li></ol>',
  stats: '<div data-ce-widget="stats" data-ce-label="Estatisticas" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;text-align:center;"><div><strong style="display:block;font-size:42px;">15+</strong><span>Anos de experiencia</span></div><div><strong style="display:block;font-size:42px;">500</strong><span>Projetos</span></div><div><strong style="display:block;font-size:42px;">98%</strong><span>Satisfacao</span></div></div>',
  faq: '<section data-ce-widget="faq" style="display:grid;gap:10px;"><h2 style="margin:0 0 12px;">Perguntas frequentes</h2><details open style="padding:14px 0;border-bottom:1px solid currentColor;"><summary>Como funciona o atendimento?</summary><p>Explique aqui o processo.</p></details><details style="padding:14px 0;border-bottom:1px solid currentColor;"><summary>Qual o prazo?</summary><p>Informe aqui o prazo medio.</p></details></section>',
  table: '<div data-ce-widget="table" style="overflow:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:12px;border:1px solid currentColor;text-align:left;">Item</th><th style="padding:12px;border:1px solid currentColor;text-align:left;">Descricao</th><th style="padding:12px;border:1px solid currentColor;text-align:left;">Valor</th></tr></thead><tbody><tr><td style="padding:12px;border:1px solid currentColor;">Produto</td><td style="padding:12px;border:1px solid currentColor;">Detalhes</td><td style="padding:12px;border:1px solid currentColor;">R$ 0</td></tr></tbody></table></div>',
  comparison: '<div data-ce-widget="comparison" data-ce-label="Tabela comparativa" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid currentColor;"><div style="padding:18px;"><strong>Recurso</strong><p>Medicao</p><p>Instalacao</p></div><div style="padding:18px;border-left:1px solid currentColor;"><strong>Opcao A</strong><p>Inclusa</p><p>Inclusa</p></div><div style="padding:18px;border-left:1px solid currentColor;"><strong>Opcao B</strong><p>Inclusa</p><p>Consultar</p></div></div>',
  products: '<div data-ce-widget="products" data-ce-label="Grade de produtos" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;"><article style="border:1px solid currentColor;padding:18px;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><h3>Produto 1</h3><p>Descricao do produto.</p></article><article style="border:1px solid currentColor;padding:18px;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><h3>Produto 2</h3><p>Descricao do produto.</p></article><article style="border:1px solid currentColor;padding:18px;"><img src="/assets/logo-letra.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:contain;" /><h3>Produto 3</h3><p>Descricao do produto.</p></article></div>',
  portfolio: '<div data-ce-widget="portfolio" data-ce-label="Portfolio" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;"><figure style="margin:0;"><img src="/assets/logo-letra.svg" alt="Projeto 1" style="width:100%;aspect-ratio:16/10;object-fit:contain;" /><figcaption>Projeto 1</figcaption></figure><figure style="margin:0;"><img src="/assets/logo-letra.svg" alt="Projeto 2" style="width:100%;aspect-ratio:16/10;object-fit:contain;" /><figcaption>Projeto 2</figcaption></figure></div>',
  "search-box": '<form data-ce-widget="search-box" role="search" style="display:flex;gap:8px;"><input type="search" placeholder="O que voce procura?" style="flex:1;padding:12px;border:1px solid currentColor;background:transparent;color:inherit;" /><button type="submit" style="padding:12px 18px;border:1px solid currentColor;background:transparent;color:inherit;">Buscar</button></form>',
  breadcrumbs: '<nav data-ce-widget="breadcrumbs" aria-label="Caminho da pagina" style="display:flex;gap:8px;align-items:center;"><a href="/" style="color:inherit;">Inicio</a><span>/</span><span>Pagina atual</span></nav>',
  "social-icons": '<div data-ce-widget="social-icons" data-ce-label="Redes sociais" style="display:flex;gap:14px;font-size:28px;"><a href="#" aria-label="Instagram" style="color:inherit;"><i class="ti ti-brand-instagram"></i></a><a href="#" aria-label="Facebook" style="color:inherit;"><i class="ti ti-brand-facebook"></i></a><a href="#" aria-label="Pinterest" style="color:inherit;"><i class="ti ti-brand-pinterest"></i></a></div>',
  share: '<div data-ce-widget="share" data-ce-label="Compartilhar" style="display:flex;align-items:center;gap:12px;"><span>Compartilhar:</span><a href="#" style="color:inherit;">Facebook</a><a href="#" style="color:inherit;">WhatsApp</a><a href="#" style="color:inherit;">E-mail</a></div>',
  embed: '<div data-ce-widget="embed" data-ce-label="Embed externo" style="display:grid;place-items:center;min-height:220px;border:1px dashed currentColor;padding:24px;text-align:center;">Cole o codigo do servico externo na edicao de conteudo.</div>'
};

export default function EditorPage() {
  const { slug } = useParams();
  const iframeRef = useRef(null);
  const saveResolver = useRef(null);
  const selectedIdRef = useRef(null);
  const [page, setPage] = useState(null);
  const [html, setHtml] = useState("");
  const [selected, setSelected] = useState(null);
  const [tree, setTree] = useState([]);
  const [panel, setPanel] = useState("elements");
  const [settingsTab, setSettingsTab] = useState("content");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [mode, setMode] = useState("visual");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const isGlobalPart = page?.page_type?.startsWith("global_");

  useEffect(() => { loadPage(); }, [slug]);

  useEffect(() => {
    function onMessage(event) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "ce-selected") {
        const next = event.data.element;
        setPanel("edit");
        if (next?.id !== selectedIdRef.current) {
          selectedIdRef.current = next?.id;
          setSettingsTab("content");
        }
        setSelected(next);
      }
      if (event.data.type === "ce-tree") setTree(event.data.tree || []);
      if (event.data.type === "ce-carousel-images") {
        setSelected((current) => current?.id === event.data.id ? { ...current, images: event.data.images || [] } : current);
      }
      if (event.data.type === "ce-changed") setStatus("Alteracoes nao salvas");
      if (event.data.type === "ce-html" && saveResolver.current) {
        saveResolver.current(event.data.html);
        saveResolver.current = null;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function loadPage() {
    setError("");
    const response = await fetch(`/api/pages/${slug}`);
    if (response.status === 401) { window.location.href = "/admin"; return; }
    if (!response.ok) { setError("Nao foi possivel abrir esta pagina."); return; }
    const data = await response.json();
    if (data.page.page_type?.startsWith("global_")) {
      window.location.replace("/admin/pages");
      return;
    }
    setPage(data.page);
    setHtml(data.page.html);
    setSelected(null);
    selectedIdRef.current = null;
    setPanel("elements");
    setStatus("");
  }

  const iframeHtml = useMemo(() => withEditorBridge(html), [html]);
  const visibleGroups = useMemo(() => {
    const query = widgetSearch.trim().toLowerCase();
    if (!query) return widgetGroups;
    return widgetGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(query)) })).filter((group) => group.items.length);
  }, [widgetSearch]);

  function post(type, payload = {}) { iframeRef.current?.contentWindow?.postMessage({ type, ...payload }, "*"); }

  function requestHtmlFromFrame() {
    return new Promise((resolve) => {
      saveResolver.current = resolve;
      post("ce-request-html");
      setTimeout(() => { if (saveResolver.current) { saveResolver.current = null; resolve(html); } }, 1200);
    });
  }

  async function save() {
    setStatus("Salvando...");
    setError("");
    const nextHtml = mode === "visual" ? await requestHtmlFromFrame() : html;
    const response = await fetch(`/api/pages/${slug}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: nextHtml, title: page?.title }) });
    if (!response.ok) { setStatus(""); setError("Nao foi possivel salvar."); return; }
    const data = await response.json();
    setPage(data.page);
    setHtml(data.page.html);
    setStatus("Pagina salva.");
  }

  async function resetOriginal() {
    if (!confirm("Restaurar o HTML original desta pagina?")) return;
    const response = await fetch(`/api/pages/${slug}/reset`, { method: "POST" });
    const data = await response.json();
    setPage(data.page);
    setHtml(data.page.html);
    setSelected(null);
    selectedIdRef.current = null;
    setPanel("elements");
    setStatus("Original restaurado.");
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) { setError("Upload nao concluido."); return; }
    const data = await response.json();
    updateAttr("src", data.path);
  }

  async function uploadCarouselImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError("");
    const paths = [];
    for (let index = 0; index < files.length; index += 1) {
      setStatus(`Enviando imagem ${index + 1} de ${files.length}...`);
      const form = new FormData();
      form.append("file", files[index]);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      if (!response.ok) {
        setStatus("");
        setError(`Nao foi possivel enviar ${files[index].name}.`);
        event.target.value = "";
        return;
      }
      const data = await response.json();
      paths.push(data.path);
    }
    post("ce-carousel-add-images", { paths });
    setStatus(`${paths.length} ${paths.length === 1 ? "imagem adicionada" : "imagens adicionadas"}. Salve a pagina para publicar.`);
    event.target.value = "";
  }

  async function uploadBackgroundImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) { setError("Upload nao concluido."); return; }
    const data = await response.json();
    updateStyles({
      backgroundImage: `url('${data.path}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    });
    event.target.value = "";
  }

  async function uploadBackgroundVideo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Video muito grande. O limite e 50 MB.");
      event.target.value = "";
      return;
    }
    setStatus("Enviando video...");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) { setStatus(""); setError("Upload do video nao concluido."); return; }
    const data = await response.json();
    setStatus("");
    setSelected((current) => current ? { ...current, bgVideo: data.path, bgVideoTipo: "arquivo" } : current);
    post("ce-bg-video", { tipo: "arquivo", src: data.path });
    event.target.value = "";
  }

  function aplicarVideoUrl(url) {
    const limpo = String(url || "").trim();
    if (!limpo) return;
    setSelected((current) => current ? { ...current, bgVideo: limpo, bgVideoTipo: "youtube" } : current);
    post("ce-bg-video", { tipo: "youtube", src: limpo });
  }

  function removerVideoFundo() {
    setSelected((current) => current ? { ...current, bgVideo: "", bgVideoTipo: "" } : current);
    post("ce-bg-video-remove");
  }

  function updateStyle(name, value) {
    setSelected((current) => current ? { ...current, [name]: value } : current);
    post("ce-style", { name, value });
  }

  function updateStyles(styles) {
    setSelected((current) => current ? { ...current, ...styles } : current);
    post("ce-styles", { styles });
  }

  function updateAttr(name, value) {
    const stateName = name === "class" ? "className" : name;
    setSelected((current) => current ? { ...current, [stateName]: value } : current);
    post("ce-attr", { name, value });
  }

  function startDrag(event, type) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/casa-estampa-widget", type);
    window.__CE_DRAG_WIDGET = type;
  }

  function addWidget(type) {
    post("ce-add-widget", { widget: type });
  }

  function setContainerLayout(preset) {
    const presets = {
      column: { display: "flex", flexDirection: "column", flexWrap: "nowrap", gridTemplateColumns: "", alignItems: "stretch" },
      row: { display: "flex", flexDirection: "row", flexWrap: "wrap", gridTemplateColumns: "", alignItems: "stretch" },
      grid2: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", flexDirection: "", flexWrap: "" },
      grid3: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", flexDirection: "", flexWrap: "" },
      grid4: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", flexDirection: "", flexWrap: "" }
    };
    updateStyles(presets[preset]);
  }

  return (
    <div className="admin-shell editor-shell">
      <div className="editor-layout">
        <aside className={`editor-panel ${panel === "edit" ? "panel-edit-mode" : ""}`}>
          <div className="editor-panel-head">
            {panel === "edit" ? (
              <>
                <button className="panel-back" onClick={() => setPanel("elements")} title="Voltar aos widgets"><IconArrowLeft size={20} /></button>
                <div className="selected-heading"><small>Editando</small><strong>{selected?.label || "Elemento"}</strong></div>
              </>
            ) : (
              <a className="admin-brand" href="/admin/pages"><img src="/assets/logo-icone.svg" alt="" /><img src="/assets/logo-letra.svg" alt="Casa Estampa" /></a>
            )}
          </div>

          {panel !== "edit" ? <div className="panel-tabs" role="tablist" aria-label="Painel do editor"><button className={panel === "elements" ? "active" : ""} onClick={() => setPanel("elements")}>Elementos</button><button className={panel === "navigator" ? "active" : ""} onClick={() => setPanel("navigator")}>Navegador</button></div> : null}

          <div className={`editor-panel-scroll ${panel === "edit" ? "is-editing" : ""}`}>
            {panel === "elements" ? (
              <>
                <label className="widget-search"><IconSearch size={17} /><input value={widgetSearch} onChange={(event) => setWidgetSearch(event.target.value)} placeholder="Buscar entre 58 widgets" /></label>
                <p className="panel-help">Arraste para a pagina ou clique para inserir no container selecionado. Para fotos: use <strong>Galeria</strong> para uma grade vertical (varias linhas) ou <strong>Carrossel</strong> para uma linha horizontal com rolagem. Depois de inserir, selecione a galeria/carrossel e use o botao "Adicionar foto" para incluir quantas imagens quiser.</p>
                {visibleGroups.map((group) => <div className="tool-group" key={group.label}><div className="tool-title">{group.label}</div><div className="widget-grid">{group.items.map((widget) => { const Icon = widget.icon; return <button className="widget" key={widget.type} draggable onDragStart={(event) => startDrag(event, widget.type)} onDragEnd={() => { window.__CE_DRAG_WIDGET = null; }} onClick={() => addWidget(widget.type)} title={`Adicionar ${widget.label}`}><Icon size={22} /><span>{widget.label}</span></button>; })}</div></div>)}
              </>
            ) : null}

            {panel === "navigator" ? <div className="navigator-wrap"><div className="tool-title">Estrutura da pagina</div>{tree.length ? <TreeNodes nodes={tree} selectedId={selected?.id} onSelect={(id) => post("ce-select-id", { id })} /> : <p className="panel-help">A estrutura aparecera quando a pagina carregar.</p>}</div> : null}

            {panel === "edit" && selected ? <ElementEditor key={selected.id} selected={selected} settingsTab={settingsTab} setSettingsTab={setSettingsTab} updateStyle={updateStyle} updateStyles={updateStyles} updateAttr={updateAttr} setSelected={setSelected} post={post} uploadImage={uploadImage} uploadCarouselImages={uploadCarouselImages} uploadBackgroundImage={uploadBackgroundImage} uploadBackgroundVideo={uploadBackgroundVideo} aplicarVideoUrl={aplicarVideoUrl} removerVideoFundo={removerVideoFundo} setContainerLayout={setContainerLayout} addWidget={addWidget} /> : null}
          </div>
        </aside>

        <main className="editor-stage">
          <div className="editor-toolbar">
            <div className="editor-page-name"><h1>{page?.title || "Editor"}</h1><span>{isGlobalPart ? "Area compartilhada em todas as paginas" : page?.is_home ? "/ (pagina inicial)" : `/${slug}`}</span></div>
            <div className="editor-toolbar-actions">
              <div className="view-toggle"><button className={mode === "visual" ? "active" : ""} onClick={() => setMode("visual")} title="Editor visual"><IconPlayerPlay size={17} /> Visual</button><button className={mode === "html" ? "active" : ""} onClick={() => setMode("html")} title="Codigo HTML"><IconCode size={17} /> HTML</button></div>
              <button className="btn btn-icon" onClick={loadPage} title="Recarregar"><IconRefresh size={18} /></button>
              <button className="btn btn-icon" onClick={resetOriginal} title="Restaurar original"><IconArrowBackUp size={18} /></button>
              <a className="btn btn-icon" href={isGlobalPart || page?.is_home ? "/" : `/${slug}`} target="_blank" title="Ver publicada"><IconExternalLink size={18} /></a>
              <button className="btn btn-primary" onClick={save}><IconDeviceFloppy size={18} /> Salvar</button>
            </div>
          </div>
          <div className="editor-notice-row"><div className="canvas-breadcrumb">{selected?.path?.length ? selected.path.map((item, index) => <span key={`${item.id}-${index}`}>{item.label}</span>) : <span>Selecione um elemento para editar</span>}</div><span>{status || "Arraste um widget ou use os botoes + na pagina."}</span>{error ? <span className="editor-error">{error}</span> : null}</div>
          <div className="editor-frame-wrap">{mode === "visual" ? <iframe ref={iframeRef} className="editor-frame" srcDoc={iframeHtml} title="Preview editavel" /> : <textarea className="raw-html" value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} />}</div>
        </main>
      </div>
    </div>
  );
}

function ElementEditor({ selected, settingsTab, setSettingsTab, updateStyle, updateStyles, updateAttr, setSelected, post, uploadImage, uploadCarouselImages, uploadBackgroundImage, uploadBackgroundVideo, aplicarVideoUrl, removerVideoFundo, setContainerLayout, addWidget }) {
  const [carouselUrl, setCarouselUrl] = useState("");
  const structural = selected.kind === "container" || selected.kind === "section" || selected.kind === "structure";
  const isImage = selected.tag === "img";
  const isVideo = selected.tag === "video";
  const isAudio = selected.tag === "audio";
  const isIcon = selected.tag === "i" || selected.iconName;
  const hasVisualMediaEditor = isImage || isVideo || isAudio;
  return <div className="element-editor">
    <div className="selected-path">{selected.path?.map((item) => item.label).join(" / ")}</div>
    <div className="settings-tabs"><button className={settingsTab === "content" ? "active" : ""} onClick={() => setSettingsTab("content")}>Conteudo</button><button className={settingsTab === "style" ? "active" : ""} onClick={() => setSettingsTab("style")}>Estilo</button><button className={settingsTab === "layout" ? "active" : ""} onClick={() => setSettingsTab("layout")}>Layout</button><button className={settingsTab === "advanced" ? "active" : ""} onClick={() => setSettingsTab("advanced")}>Avancado</button></div>

    {settingsTab === "content" ? <div className="settings-body">
      {structural ? <><div className="control-section"><div className="control-label">Adicionar dentro</div><div className="quick-structure-grid"><button onClick={() => addWidget("container")}><IconBox size={18} />Container</button><button onClick={() => addWidget("columns")}><IconLayoutColumns size={18} />2 colunas</button><button onClick={() => addWidget("columns3")}><IconLayoutGrid size={18} />3 colunas</button><button onClick={() => addWidget("columns4")}><IconLayoutGrid size={18} />4 colunas</button></div></div><p className="panel-help">Selecione um container filho para editar seu conteudo. Use Layout para deixa-los lado a lado.</p></> : null}

      {isIcon ? <div className="control-section"><div className="control-label">Escolher icone</div><div className="icon-picker">{TABLER_ICONS.map(([className, label]) => <button key={className} className={selected.iconName === className ? "active" : ""} onClick={() => { setSelected((current) => ({ ...current, iconName: className })); post("ce-icon", { iconName: className }); }} title={label}><i className={`ti ${className}`} aria-hidden="true"></i><span>{label}</span></button>)}</div></div> : null}

      {isImage ? <><div className="media-preview"><img src={selected.src || "/assets/logo-letra.svg"} alt="Previa da imagem" /></div><label className="field"><span>Endereco da imagem</span><input value={selected.src || ""} onChange={(event) => updateAttr("src", event.target.value)} /></label><label className="field"><span>Texto alternativo</span><input value={selected.alt || ""} placeholder="Descreva a imagem" onChange={(event) => updateAttr("alt", event.target.value)} /></label><label className="field"><span>Ajuste da imagem</span><select value={selected.objectFit || ""} onChange={(event) => updateStyle("objectFit", event.target.value)}><option value="">Automatico</option><option value="cover">Preencher e cortar</option><option value="contain">Mostrar inteira</option><option value="fill">Esticar</option></select></label><div className="field-row"><label className="field"><span>Proporcao (largura/altura)</span><input value={selected.aspectRatio || ""} placeholder="Ex.: 4/3, 1/1, 16/9" onChange={(event) => updateStyle("aspectRatio", event.target.value)} /></label><label className="field"><span>Altura fixa</span><input value={selected.height || ""} placeholder="Ex.: 240px" onChange={(event) => updateStyle("height", event.target.value)} /></label></div><p className="field-hint">Defina uma proporcao (ou uma altura fixa) para que as fotos de uma galeria ou carrossel fiquem todas do mesmo tamanho, mesmo que os arquivos originais tenham dimensoes diferentes.</p><label className="upload-field"><IconPhoto size={18} />Enviar nova imagem<input type="file" accept="image/*" onChange={uploadImage} /></label></> : null}

      {selected.widget === "gallery" ? <div className="control-section"><div className="control-label">Galeria (grade vertical)</div><p className="panel-help">Adicione novas fotos sem limite. Cada foto entra com o mesmo tamanho e proporcao das demais.</p><button className="btn btn-primary" onClick={() => post("ce-add-photo")}><IconPhoto size={17} />Adicionar foto</button></div> : null}

      {selected.widget === "carousel" ? <div className="control-section carousel-manager">
        <div className="carousel-manager-head"><div><div className="control-label">Imagens do carrossel</div><strong>{selected.images?.length || 0} {(selected.images?.length || 0) === 1 ? "imagem" : "imagens"}</strong></div><span>Sem limite</span></div>
        <p className="panel-help">Selecione varias imagens de uma vez. Use as setas para definir a ordem em que elas aparecem.</p>
        <label className="upload-field carousel-upload"><IconPhoto size={18} />Selecionar imagens<input type="file" accept="image/*" multiple onChange={uploadCarouselImages} /></label>
        <div className="carousel-url-add"><input value={carouselUrl} onChange={(event) => setCarouselUrl(event.target.value)} placeholder="Ou cole o endereco de uma imagem" /><button className="btn" disabled={!carouselUrl.trim()} onClick={() => { post("ce-carousel-add-images", { paths: [carouselUrl.trim()] }); setCarouselUrl(""); }}>Adicionar</button></div>
        {selected.images?.length ? <div className="carousel-image-list">{selected.images.map((image, index) => <article className="carousel-image-item" key={`carousel-image-${index}`}>
          <img src={image.src || "/assets/logo-letra.svg"} alt="" />
          <div className="carousel-image-info"><strong>Imagem {index + 1}</strong><input aria-label={`Endereco da imagem ${index + 1}`} value={image.src || ""} onChange={(event) => post("ce-carousel-update-image", { index, name: "src", value: event.target.value })} /><input aria-label={`Texto alternativo da imagem ${index + 1}`} value={image.alt || ""} placeholder="Descricao da imagem" onChange={(event) => post("ce-carousel-update-image", { index, name: "alt", value: event.target.value })} /></div>
          <div className="carousel-image-actions"><button disabled={index === 0} onClick={() => post("ce-carousel-move-image", { index, direction: -1 })} title="Mover para a esquerda"><IconArrowUp size={16} /></button><button disabled={index === selected.images.length - 1} onClick={() => post("ce-carousel-move-image", { index, direction: 1 })} title="Mover para a direita"><IconArrowDown size={16} /></button><button className="danger" onClick={() => post("ce-carousel-remove-image", { index })} title="Remover imagem"><IconTrash size={16} /></button></div>
        </article>)}</div> : <div className="carousel-empty"><IconPhoto size={25} /><span>Nenhuma imagem cadastrada</span></div>}
      </div> : null}

      {isVideo || isAudio ? <><div className="media-status"><IconPlayerPlay size={26} /><div><strong>{isVideo ? "Arquivo de video" : "Arquivo de audio"}</strong><span>{selected.src || "Nenhum arquivo selecionado"}</span></div></div><label className="field"><span>Endereco do arquivo</span><input value={selected.src || ""} placeholder="https://... ou arquivo enviado" onChange={(event) => updateAttr("src", event.target.value)} /></label>{isVideo ? <label className="field"><span>Imagem de capa</span><input value={selected.poster || ""} placeholder="/uploads/capa.jpg" onChange={(event) => updateAttr("poster", event.target.value)} /></label> : null}<div className="media-toggles"><label><input type="checkbox" checked={Boolean(selected.controls)} onChange={(event) => updateAttr("controls", event.target.checked ? "controls" : "")} />Mostrar controles</label><label><input type="checkbox" checked={Boolean(selected.autoplay)} onChange={(event) => updateAttr("autoplay", event.target.checked ? "autoplay" : "")} />Reproducao automatica</label><label><input type="checkbox" checked={Boolean(selected.loop)} onChange={(event) => updateAttr("loop", event.target.checked ? "loop" : "")} />Repetir</label>{isVideo ? <label><input type="checkbox" checked={Boolean(selected.muted)} onChange={(event) => updateAttr("muted", event.target.checked ? "muted" : "")} />Sem som</label> : null}</div><label className="upload-field"><IconPlayerPlay size={18} />Enviar {isVideo ? "video" : "audio"}<input type="file" accept={isVideo ? "video/*" : "audio/*"} onChange={uploadImage} /></label></> : null}

      {!structural && !isIcon && !hasVisualMediaEditor ? <label className="field"><span>Texto / conteudo HTML</span><textarea value={selected.html || ""} onChange={(event) => { setSelected((current) => ({ ...current, html: event.target.value })); post("ce-html-content", { value: event.target.value }); }} /></label> : null}
      {(selected.tag === "a" || selected.href) ? <label className="field"><span>Link</span><input value={selected.href || ""} onChange={(event) => updateAttr("href", event.target.value)} /></label> : null}
      <label className="field"><span>Nome no navegador</span><input value={selected.customLabel || ""} placeholder={selected.label} onChange={(event) => updateAttr("data-ce-label", event.target.value)} /></label>
    </div> : null}

    {settingsTab === "style" ? <div className="settings-body">
      <div className="control-section"><div className="control-label">Cores</div><div className="color-row"><ColorField label="Texto" value={selected.color || "#222222"} onChange={(value) => updateStyle("color", value)} /><ColorField label="Fundo" value={selected.backgroundColor || "#ffffff"} onChange={(value) => updateStyle("backgroundColor", value)} /></div><button className="text-action" onClick={() => updateStyle("backgroundColor", "transparent")}>Fundo transparente</button></div>
      <div className="control-section">
        <div className="control-label">Imagem de fundo (background)</div>
        <p className="field-hint">Envie uma foto para usar como fundo desta secao/container. Ela cobre toda a area do elemento, atras do conteudo.</p>
        {selected.backgroundImage && selected.backgroundImage !== "none" ? (
          <div className="media-preview" style={{ backgroundImage: selected.backgroundImage, backgroundSize: "cover", backgroundPosition: "center", minHeight: 96 }} />
        ) : null}
        <label className="upload-field"><IconPhoto size={18} />{selected.backgroundImage && selected.backgroundImage !== "none" ? "Trocar imagem de fundo" : "Enviar imagem de fundo"}<input type="file" accept="image/*" onChange={uploadBackgroundImage} /></label>
        {selected.backgroundImage && selected.backgroundImage !== "none" ? (
          <>
            <div className="field-row">
              <label className="field"><span>Ajuste</span><select value={selected.backgroundSize || "cover"} onChange={(event) => updateStyle("backgroundSize", event.target.value)}><option value="cover">Preencher e cortar</option><option value="contain">Mostrar inteira</option><option value="auto">Tamanho original</option></select></label>
              <label className="field"><span>Posicao</span><select value={selected.backgroundPosition || "center"} onChange={(event) => updateStyle("backgroundPosition", event.target.value)}><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Base</option><option value="left">Esquerda</option><option value="right">Direita</option></select></label>
            </div>
            <label className="field"><span>Repetir</span><select value={selected.backgroundRepeat || "no-repeat"} onChange={(event) => updateStyle("backgroundRepeat", event.target.value)}><option value="no-repeat">Nao repetir</option><option value="repeat">Repetir (mosaico)</option></select></label>
            <button className="text-action" onClick={() => updateStyles({ backgroundImage: "none", backgroundSize: "", backgroundPosition: "", backgroundRepeat: "" })}>Remover imagem de fundo</button>
          </>
        ) : null}
      </div>
      <div className="control-section">
        <div className="control-label">Video de fundo</div>
        <p className="field-hint">Envie um arquivo de video ou cole um link do YouTube. O video roda em loop, sem som, atras do conteudo.</p>
        {selected.bgVideo ? (
          <div className="media-status">
            <IconPlayerPlay size={22} />
            <div>
              <strong>{selected.bgVideoTipo === "youtube" ? "Video do YouTube" : "Arquivo de video"}</strong>
              <span>{String(selected.bgVideo).slice(0, 52)}</span>
            </div>
          </div>
        ) : null}
        <label className="upload-field"><IconPlayerPlay size={18} />{selected.bgVideo ? "Trocar arquivo de video" : "Enviar arquivo de video"}<input type="file" accept="video/*" onChange={uploadBackgroundVideo} /></label>
        <p className="field-hint">Arquivo de ate 50 MB.</p>
        <label className="field">
          <span>Ou link do YouTube</span>
          <input
            placeholder="https://www.youtube.com/watch?v=..."
            defaultValue={selected.bgVideoTipo === "youtube" ? selected.bgVideo : ""}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); aplicarVideoUrl(event.target.value); } }}
            onBlur={(event) => aplicarVideoUrl(event.target.value)}
          />
        </label>
        {selected.bgVideo ? <button className="text-action" onClick={removerVideoFundo}>Remover video de fundo</button> : null}
      </div>
      <div className="control-section"><div className="control-label">Tipografia</div><div className="field-row"><label className="field"><span>Tamanho</span><input value={selected.fontSize || ""} placeholder="16 ou 16px" onChange={(event) => updateStyle("fontSize", event.target.value)} /></label><label className="field"><span>Peso</span><select value={selected.fontWeight || ""} onChange={(event) => updateStyle("fontWeight", event.target.value)}><option value="">Herdar</option><option value="300">Leve</option><option value="400">Normal</option><option value="600">Semi-negrito</option><option value="700">Negrito</option></select></label></div><p className="field-hint">Numeros sem unidade sao aplicados em pixels.</p><div className="field-row"><label className="field"><span>Altura da linha</span><input value={selected.lineHeight || ""} placeholder="1.6" onChange={(event) => updateStyle("lineHeight", event.target.value)} /></label><label className="field"><span>Espaco entre letras</span><input value={selected.letterSpacing || ""} placeholder="0 ou 0px" onChange={(event) => updateStyle("letterSpacing", event.target.value)} /></label></div><label className="field"><span>Fonte</span><select value={selected.fontFamily || ""} onChange={(event) => updateStyle("fontFamily", event.target.value)}><option value="">Herdar fonte global</option>{GOOGLE_FONTS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><label className="field"><span>Alinhamento do texto</span><select value={selected.textAlign || ""} onChange={(event) => updateStyle("textAlign", event.target.value)}><option value="">Herdar</option><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="justify">Justificado</option></select></label></div>
      <div className="control-section"><div className="control-label">Borda</div><div className="field-row"><label className="field"><span>Espessura</span><input value={selected.borderWidth || ""} placeholder="1px" onChange={(event) => updateStyles({ borderWidth: event.target.value, borderStyle: event.target.value ? "solid" : "" })} /></label><label className="field"><span>Raio</span><input value={selected.borderRadius || ""} placeholder="0px" onChange={(event) => updateStyle("borderRadius", event.target.value)} /></label></div><ColorField label="Cor da borda" value={selected.borderColor || selected.color || "#222222"} onChange={(value) => updateStyle("borderColor", value)} /></div>
    </div> : null}

    {settingsTab === "layout" ? <div className="settings-body">
      {selected.isContainer ? <div className="control-section"><div className="control-label">Direcao dos itens</div><div className="layout-presets"><button onClick={() => setContainerLayout("column")} className={selected.display === "flex" && selected.flexDirection === "column" ? "active" : ""}><span className="layout-preview vertical"><i></i><i></i></span>Vertical</button><button onClick={() => setContainerLayout("row")} className={selected.display === "flex" && selected.flexDirection === "row" ? "active" : ""}><span className="layout-preview horizontal"><i></i><i></i></span>Lado a lado</button><button onClick={() => setContainerLayout("grid2")} className={selected.gridTemplateColumns?.includes("repeat(2") ? "active" : ""}><span className="layout-preview horizontal"><i></i><i></i></span>2 colunas</button><button onClick={() => setContainerLayout("grid3")} className={selected.gridTemplateColumns?.includes("repeat(3") ? "active" : ""}><span className="layout-preview thirds"><i></i><i></i><i></i></span>3 colunas</button><button onClick={() => setContainerLayout("grid4")} className={selected.gridTemplateColumns?.includes("repeat(4") ? "active" : ""}><span className="layout-preview fourths"><i></i><i></i><i></i><i></i></span>4 colunas</button></div></div> : null}
      <div className="control-section"><div className="control-label">Tamanho e espacamento</div><div className="field-row"><label className="field"><span>Largura</span><input value={selected.width || ""} placeholder="auto ou 50%" onChange={(event) => updateStyle("width", event.target.value)} /></label><label className="field"><span>Largura maxima</span><input value={selected.maxWidth || ""} placeholder="1200px" onChange={(event) => updateStyle("maxWidth", event.target.value)} /></label></div><div className="field-row"><label className="field"><span>Altura minima</span><input value={selected.minHeight || ""} placeholder="100px" onChange={(event) => updateStyle("minHeight", event.target.value)} /></label><label className="field"><span>Espaco entre itens</span><input value={selected.gap || ""} placeholder="24px" onChange={(event) => updateStyle("gap", event.target.value)} /></label></div></div>
      {selected.isContainer ? <div className="control-section"><div className="control-label">Alinhamento do container</div><label className="field"><span>Horizontal</span><select value={selected.justifyContent || ""} onChange={(event) => updateStyle("justifyContent", event.target.value)}><option value="">Padrao</option><option value="flex-start">Inicio</option><option value="center">Centro</option><option value="flex-end">Fim</option><option value="space-between">Espaco entre</option><option value="space-around">Distribuido</option></select></label><label className="field"><span>Vertical</span><select value={selected.alignItems || ""} onChange={(event) => updateStyle("alignItems", event.target.value)}><option value="">Padrao</option><option value="stretch">Esticar</option><option value="flex-start">Inicio</option><option value="center">Centro</option><option value="flex-end">Fim</option></select></label></div> : null}
    </div> : null}

    {settingsTab === "advanced" ? <div className="settings-body"><div className="control-section"><div className="control-label">Inclinacao</div><label className="field"><span>Rotacao (graus) — use 0 para desfazer um elemento torto</span><div className="range-control"><input type="range" min="-45" max="45" step="1" value={selected.rotate || "0"} onChange={(event) => updateStyle("transform", event.target.value === "0" ? "" : `rotate(${event.target.value}deg)`)} /><input type="number" aria-label="Graus de rotacao" min="-180" max="180" value={selected.rotate || "0"} onChange={(event) => updateStyle("transform", event.target.value === "0" ? "" : `rotate(${event.target.value}deg)`)} /></div></label></div><div className="control-section"><div className="control-label">Espacamento</div><label className="field"><span>Margem externa</span><input placeholder="Ex.: 0 auto 24px" value={selected.margin || ""} onChange={(event) => updateStyle("margin", event.target.value)} /></label><label className="field"><span>Preenchimento interno</span><input placeholder="Ex.: 40px 24px" value={selected.padding || ""} onChange={(event) => updateStyle("padding", event.target.value)} /></label></div><div className="control-section"><div className="control-label">Posicionamento</div><div className="field-row"><label className="field"><span>Posicao</span><select value={selected.position || ""} onChange={(event) => updateStyle("position", event.target.value)}><option value="">Padrao</option><option value="relative">Relativa</option><option value="absolute">Absoluta</option><option value="sticky">Fixa ao rolar</option></select></label><label className="field"><span>Camada (z-index)</span><input value={selected.zIndex || ""} placeholder="1" onChange={(event) => updateStyle("zIndex", event.target.value)} /></label></div><label className="field"><span>Opacidade</span><div className="range-control"><input type="range" min="0" max="1" step="0.05" value={selected.opacity || "1"} onChange={(event) => updateStyle("opacity", event.target.value)} /><input type="number" aria-label="Valor da opacidade" min="0" max="1" step="0.05" value={selected.opacity || "1"} onChange={(event) => updateStyle("opacity", event.target.value)} /></div></label></div><div className="control-section"><div className="control-label">Identificacao</div><label className="field"><span>Classe CSS</span><input value={selected.className || ""} onChange={(event) => updateAttr("class", event.target.value)} /></label></div></div> : null}

    <div className="element-actions"><button className="btn" onClick={() => post("ce-select-parent")}><IconArrowBackUp size={17} />Pai</button><button className="btn" onClick={() => post("ce-duplicate")}><IconCopy size={17} />Duplicar</button><button className="btn btn-danger" onClick={() => post("ce-delete")}><IconTrash size={17} />Apagar</button></div>
  </div>;
}

function ColorField({ label, value, onChange }) {
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return <label className="field"><span>{label}</span><div className="color-control"><input type="color" aria-label={`${label} seletor`} value={safeValue} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${label} hexadecimal`} value={value} placeholder="#000000" onChange={(event) => onChange(event.target.value)} /></div></label>;
}

function TreeNodes({ nodes, selectedId, onSelect, depth = 0 }) {
  return <div className="tree-list">{nodes.map((node) => <div key={node.id}><button className={`tree-node ${selectedId === node.id ? "active" : ""}`} style={{ "--depth": depth }} onClick={() => onSelect(node.id)}><IconChevronDown size={14} className={node.children?.length ? "" : "tree-spacer"} /><span className={`tree-kind tree-kind-${node.kind}`}>{node.kind.slice(0, 1).toUpperCase()}</span><span>{node.label}</span></button>{node.children?.length ? <TreeNodes nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} /> : null}</div>)}</div>;
}

function withEditorBridge(html) {
  const templates = JSON.stringify(widgetTemplates).replace(/</g, "\\u003c");
  const bridge = `
<style id="ce-editor-style" data-ce-ui="true">
  [data-ce-selected="true"] { outline: 2px solid #1689e8 !important; outline-offset: 2px !important; }
  [data-ce-hover="true"] { outline: 1px dashed #1689e8 !important; outline-offset: 1px !important; }
  [data-ce-kind="section"], [data-ce-kind="container"] { min-height: 56px; }
  [data-ce-kind="container"]:empty { background-image: repeating-linear-gradient(135deg,rgba(22,137,232,.04),rgba(22,137,232,.04) 8px,rgba(22,137,232,.09) 8px,rgba(22,137,232,.09) 9px) !important; }
  [data-ce-drop-inside="true"] { outline: 3px solid #1689e8 !important; outline-offset: -4px !important; background-image: linear-gradient(rgba(22,137,232,.1),rgba(22,137,232,.1)) !important; }
  #ce-drop-line { position:absolute;z-index:2147483647;height:4px;border-radius:3px;background:#1689e8;pointer-events:none;box-shadow:0 0 0 2px white;display:none; }
  #ce-drop-line.vertical { width:4px;height:auto; }
  #ce-drop-label { position:absolute;z-index:2147483647;display:none;padding:5px 9px;color:white;background:#1689e8;border-radius:4px;font:600 11px/1 Arial,sans-serif;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.25); }
  #ce-selection-bar { position:absolute;z-index:2147483646;display:none;align-items:center;height:28px;color:white;background:#1689e8;border-radius:4px 4px 0 0;font:600 11px/1 Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2); }
  #ce-selection-bar .ce-name { padding:0 9px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  #ce-selection-bar button { display:grid;place-items:center;width:28px;height:28px;padding:0;color:white;background:transparent;border:0;border-left:1px solid rgba(255,255,255,.25);font:700 14px Arial,sans-serif;cursor:pointer; }
  #ce-selection-bar button:hover { background:rgba(0,0,0,.18); }
  #ce-quick-wrap { position:absolute;z-index:2147483647;display:none;transform:translate(-50%,-50%);font-family:Arial,sans-serif; }
  #ce-quick-button { display:grid;place-items:center;width:30px;height:30px;padding:0;color:white;background:#1689e8;border:2px solid white;border-radius:50%;font:700 21px/1 Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3);cursor:pointer; }
  #ce-quick-menu { position:absolute;left:50%;bottom:38px;display:none;grid-template-columns:repeat(3,76px);gap:5px;padding:7px;background:#20242a;border:1px solid rgba(255,255,255,.18);border-radius:6px;transform:translateX(-50%);box-shadow:0 10px 30px rgba(0,0,0,.35); }
  #ce-quick-wrap.open #ce-quick-menu { display:grid; }
  #ce-quick-menu button { min-height:44px;padding:5px;color:white;background:#303741;border:1px solid rgba(255,255,255,.1);border-radius:4px;font:600 10px/1.2 Arial,sans-serif;cursor:pointer; }
  #ce-context-menu { position:fixed;z-index:2147483647;display:none;min-width:190px;padding:6px;background:#20242a;border:1px solid rgba(255,255,255,.18);border-radius:6px;box-shadow:0 14px 35px rgba(0,0,0,.4);font:12px Arial,sans-serif; }
  #ce-context-menu button { display:flex;width:100%;padding:9px 10px;color:white;background:transparent;border:0;border-radius:4px;text-align:left;cursor:pointer; }
  #ce-context-menu button:hover { background:#303741; }
  #ce-context-menu button.danger { color:#ffaaa0; }
</style>
<script id="ce-editor-bridge" data-ce-ui="true">
(() => {
  const templates = ${templates};
  const ignoredTags = new Set(["HTML","HEAD","BODY","SCRIPT","STYLE","META","LINK","TITLE","BR"]);
  const structuralTags = new Set(["MAIN","HEADER","FOOTER","NAV","SECTION","ARTICLE"]);
  let selected = null;
  let counter = 1;
  let dropState = null;

  const ui = document.createElement("div");
  ui.dataset.ceUi = "true";
  ui.innerHTML = '<div id="ce-drop-line" data-ce-ui="true"></div><div id="ce-drop-label" data-ce-ui="true"></div><div id="ce-selection-bar" data-ce-ui="true"><span class="ce-name"></span><button data-action="parent" title="Selecionar pai">&#8593;</button><button data-action="duplicate" title="Duplicar">&#9635;</button><button data-action="delete" title="Apagar">&#215;</button></div><div id="ce-quick-wrap" data-ce-ui="true"><button id="ce-quick-button" title="Adicionar aqui">+</button><div id="ce-quick-menu"><button data-widget="section">Secao</button><button data-widget="container">Container</button><button data-widget="columns">2 colunas</button><button data-widget="columns3">3 colunas</button><button data-widget="title">Titulo</button><button data-widget="text">Texto</button></div></div><div id="ce-context-menu" data-ce-ui="true"><button data-action="edit">Editar elemento</button><button data-action="parent">Selecionar pai</button><button data-action="duplicate">Duplicar</button><button data-action="before">Inserir container antes</button><button data-action="after">Inserir container depois</button><button class="danger" data-action="delete">Apagar</button></div>';
  document.body.appendChild(ui);
  const dropLine = ui.querySelector("#ce-drop-line");
  const dropLabel = ui.querySelector("#ce-drop-label");
  const selectionBar = ui.querySelector("#ce-selection-bar");
  const quickWrap = ui.querySelector("#ce-quick-wrap");
  const contextMenu = ui.querySelector("#ce-context-menu");

  function isUi(element) { return !element || element.closest?.("[data-ce-ui]"); }
  function editableElements() { return Array.from(document.querySelectorAll("body *")).filter((element) => !ignoredTags.has(element.tagName) && !isUi(element)); }
  function assignIds() { editableElements().forEach((element) => { if (!element.dataset.ceId) element.dataset.ceId = String(counter++); if(!element.dataset.ceWidget&&element.matches(".carousel-track,.inst-track,.insp-track,.gal-track")){element.dataset.ceWidget="carousel";element.dataset.ceLabel="Carrossel de imagens";} }); }
  function kindOf(element) { if (element.dataset.ceKind) return element.dataset.ceKind; if (structuralTags.has(element.tagName)) return element.tagName === "SECTION" ? "section" : "structure"; if (element.dataset.ceWidget) return "widget"; if (["DIV","UL","OL","FORM"].includes(element.tagName) && element.children.length) return "container"; return "widget"; }
  function labelOf(element) { if (element.dataset.ceLabel) return element.dataset.ceLabel; if (element.dataset.ceWidget) return element.dataset.ceWidget.replace(/-/g," ").replace(/^./,(letter) => letter.toUpperCase()); const names = { MAIN:"Conteudo principal",HEADER:"Cabecalho",FOOTER:"Rodape",NAV:"Navegacao",SECTION:"Secao",DIV:"Container",H1:"Titulo H1",H2:"Titulo H2",H3:"Titulo H3",P:"Texto",A:"Link / Botao",IMG:"Imagem",UL:"Lista",OL:"Lista",FORM:"Formulario",IFRAME:"Mapa / quadro",VIDEO:"Video",AUDIO:"Audio",BLOCKQUOTE:"Citacao",HR:"Divisor" }; return names[element.tagName] || element.tagName.toLowerCase(); }
  function canContain(element) { return ["BODY","MAIN","HEADER","FOOTER","NAV","SECTION","ARTICLE","DIV","LI","FORM"].includes(element.tagName); }
  function pathOf(element) { const path = []; let current = element; while (current && current !== document.body) { if (!isUi(current)) path.unshift({ id:current.dataset.ceId,label:labelOf(current),kind:kindOf(current) }); current = current.parentElement; } return path.slice(-6); }
  function inlineOrComputed(element, name) { return element.style[name] || window.getComputedStyle(element)[name] || ""; }
  function carouselItems(element) { return Array.from(element.children).filter((child)=>!isUi(child)&&!child.hasAttribute("data-ce-bg-video")).map((node)=>({node,image:node.tagName==="IMG"?node:node.querySelector("img")})).filter((item)=>item.image); }
  function info(element) { const style = window.getComputedStyle(element); const classNames = typeof element.className === "string" ? element.className.split(/\\s+/) : []; const iconName = classNames.find((name) => name.startsWith("ti-") && name !== "ti") || ""; return { id:element.dataset.ceId,tag:element.tagName.toLowerCase(),kind:kindOf(element),label:labelOf(element),customLabel:element.dataset.ceLabel || "",path:pathOf(element),isContainer:canContain(element),className:typeof element.className === "string" ? element.className : "",html:element.innerHTML || "",href:element.getAttribute("href") || "",src:element.getAttribute("src") || element.querySelector("source")?.getAttribute("src") || "",alt:element.getAttribute("alt") || "",poster:element.getAttribute("poster") || "",controls:element.hasAttribute("controls"),autoplay:element.hasAttribute("autoplay"),loop:element.hasAttribute("loop"),muted:element.hasAttribute("muted"),iconName,color:rgbToHex(style.color,"#222222"),backgroundColor:rgbToHex(style.backgroundColor,""),bgVideo:(()=>{const c=element.querySelector(":scope > [data-ce-bg-video]");if(!c)return "";const f=c.querySelector("iframe");return f?f.getAttribute("src")||"":(c.querySelector("video")?.getAttribute("src")||"");})(),bgVideoTipo:element.querySelector(":scope > [data-ce-bg-video]")?.getAttribute("data-ce-bg-video")||"",backgroundImage:element.style.backgroundImage||(style.backgroundImage!=="none"?style.backgroundImage:"")||"",backgroundSize:element.style.backgroundSize||"",backgroundPosition:element.style.backgroundPosition||"",backgroundRepeat:element.style.backgroundRepeat||"",fontSize:inlineOrComputed(element,"fontSize"),fontWeight:inlineOrComputed(element,"fontWeight"),lineHeight:inlineOrComputed(element,"lineHeight"),letterSpacing:inlineOrComputed(element,"letterSpacing"),fontFamily:element.style.fontFamily || "",textAlign:inlineOrComputed(element,"textAlign"),display:inlineOrComputed(element,"display"),flexDirection:inlineOrComputed(element,"flexDirection"),flexWrap:inlineOrComputed(element,"flexWrap"),gridTemplateColumns:inlineOrComputed(element,"gridTemplateColumns"),justifyContent:inlineOrComputed(element,"justifyContent"),alignItems:inlineOrComputed(element,"alignItems"),gap:inlineOrComputed(element,"gap"),width:element.style.width || "",maxWidth:element.style.maxWidth || "",minHeight:element.style.minHeight || "",height:element.style.height || "",aspectRatio:element.style.aspectRatio || "",objectFit:element.style.objectFit || "",widget:element.dataset.ceWidget || "",rotate:(element.style.transform.match(/rotate\(([-\d.]+)deg\)/)||[])[1] || "0",padding:element.style.padding || "",margin:element.style.margin || "",borderWidth:element.style.borderWidth || "",borderColor:rgbToHex(style.borderColor,"#222222"),borderRadius:element.style.borderRadius || "",position:element.style.position || "",zIndex:element.style.zIndex || "",opacity:element.style.opacity || "1" }; }
  function select(element) { if (!element || ignoredTags.has(element.tagName) || isUi(element)) return; if (selected) selected.removeAttribute("data-ce-selected"); selected = element; selected.dataset.ceSelected = "true"; positionSelectionUi(); window.parent.postMessage({type:"ce-selected",element:info(selected)},"*"); if(selected.dataset.ceWidget==="carousel")window.parent.postMessage({type:"ce-carousel-images",id:selected.dataset.ceId,images:carouselItems(selected).map((item)=>({src:item.image.getAttribute("src")||"",alt:item.image.getAttribute("alt")||""}))},"*"); }
  function positionSelectionUi() { if (!selected || !document.contains(selected)) { selectionBar.style.display="none"; quickWrap.style.display="none"; return; } const rect=selected.getBoundingClientRect(); const left=Math.max(2,rect.left+window.scrollX); const top=Math.max(window.scrollY,rect.top+window.scrollY-28); selectionBar.style.display="flex"; selectionBar.style.left=left+"px"; selectionBar.style.top=top+"px"; selectionBar.querySelector(".ce-name").textContent=labelOf(selected); if (canContain(selected) || kindOf(selected)==="section") { quickWrap.style.display="block"; quickWrap.style.left=(rect.left+window.scrollX+rect.width/2)+"px"; quickWrap.style.top=(rect.bottom+window.scrollY)+"px"; } else quickWrap.style.display="none"; }
  function treeNode(element,depth) { const children=depth<6 ? Array.from(element.children).filter((child)=>!isUi(child)&&!ignoredTags.has(child.tagName)).map((child)=>treeNode(child,depth+1)).filter(Boolean) : []; const meaningful=structuralTags.has(element.tagName)||element.dataset.ceKind||element.dataset.ceWidget||["H1","H2","H3","P","A","IMG","DIV","UL","OL","FORM","IFRAME","VIDEO","BLOCKQUOTE"].includes(element.tagName); if(!meaningful&&!children.length)return null; return {id:element.dataset.ceId,label:labelOf(element),kind:kindOf(element),children}; }
  function sendTree(){const roots=Array.from(document.body.children).filter((element)=>!isUi(element)&&!ignoredTags.has(element.tagName)).map((element)=>treeNode(element,0)).filter(Boolean);window.parent.postMessage({type:"ce-tree",tree:roots},"*");}
  function changed(refresh=true){assignIds();if(refresh)sendTree();positionSelectionUi();window.parent.postMessage({type:"ce-changed"},"*");}
  function currentTarget(){if(selected&&canContain(selected))return selected;return selected?.parentElement||document.querySelector("main")||document.body;}
  function makeWidget(type){const holder=document.createElement("div");holder.innerHTML=templates[type]||templates.container;return holder.firstElementChild;}
  function insertWidget(type,state){const node=makeWidget(type);if(!node)return;const target=state?.target||currentTarget();const position=state?.position||(canContain(target)?"inside":"after");if(position==="inside"&&canContain(target))target.appendChild(node);else if(position==="before")target.before(node);else target.after(node);clearDrop();quickWrap.classList.remove("open");changed();select(node);node.scrollIntoView({behavior:"smooth",block:"center"});}
  function isHorizontalParent(element){const parent=element.parentElement;if(!parent)return false;const style=window.getComputedStyle(parent);return (style.display.includes("flex")&&style.flexDirection.startsWith("row"))||style.display.includes("grid");}
  function resolveDrop(event){let target=event.target.closest?.("[data-ce-id]")||document.body;if(isUi(target))target=selected||document.body;const rect=target.getBoundingClientRect();const horizontal=isHorizontalParent(target);const axis=horizontal?event.clientX:event.clientY;const start=horizontal?rect.left:rect.top;const size=horizontal?rect.width:rect.height;const edge=Math.min(40,Math.max(12,size*.25));let position="inside";if(!canContain(target)||axis<start+edge)position=axis<start+size/2?"before":"after";else if(axis>start+size-edge)position="after";return {target,position,horizontal};}
  function showDrop(state){if(dropState?.target)dropState.target.removeAttribute("data-ce-drop-inside");dropState=state;if(!state)return clearDrop();const rect=state.target.getBoundingClientRect();if(state.position==="inside"){state.target.dataset.ceDropInside="true";dropLine.style.display="none";dropLabel.textContent="Soltar dentro de "+labelOf(state.target);dropLabel.style.display="block";dropLabel.style.left=(rect.left+window.scrollX+rect.width/2-dropLabel.offsetWidth/2)+"px";dropLabel.style.top=(rect.top+window.scrollY+rect.height/2)+"px";return;}dropLabel.style.display="none";dropLine.classList.toggle("vertical",state.horizontal);dropLine.style.display="block";if(state.horizontal){dropLine.style.left=((state.position==="before"?rect.left:rect.right)+window.scrollX-2)+"px";dropLine.style.top=(rect.top+window.scrollY)+"px";dropLine.style.height=rect.height+"px";}else{dropLine.style.left=(rect.left+window.scrollX)+"px";dropLine.style.top=((state.position==="before"?rect.top:rect.bottom)+window.scrollY-2)+"px";dropLine.style.width=rect.width+"px";}}
  function clearDrop(){if(dropState?.target)dropState.target.removeAttribute("data-ce-drop-inside");dropState=null;dropLine.style.display="none";dropLine.classList.remove("vertical");dropLabel.style.display="none";}
  function youtubeId(url){const m=String(url).match(/(?:youtu\\.be\\/|v=|\\/embed\\/|\\/shorts\\/)([A-Za-z0-9_-]{6,})/);return m?m[1]:"";}
  function removeBgVideo(element){if(!element)return;element.querySelectorAll('[data-ce-bg-video]').forEach((n)=>n.remove());}
  function setBgVideo(element,tipo,src){
    if(!element||!src)return;
    removeBgVideo(element);
    const camada=document.createElement("div");
    camada.setAttribute("data-ce-bg-video",tipo);
    camada.style.cssText="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;";
    if(tipo==="youtube"){
      const id=youtubeId(src);
      if(!id)return;
      const frame=document.createElement("iframe");
      frame.src="https://www.youtube.com/embed/"+id+"?autoplay=1&mute=1&loop=1&playlist="+id+"&controls=0&modestbranding=1&playsinline=1&rel=0";
      frame.setAttribute("allow","autoplay; encrypted-media");
      frame.setAttribute("frameborder","0");
      frame.style.cssText="position:absolute;top:50%;left:50%;width:177.78vh;height:56.25vw;min-width:100%;min-height:100%;transform:translate(-50%,-50%);border:0;";
      camada.appendChild(frame);
    }else{
      const video=document.createElement("video");
      video.setAttribute("src",src);
      ["autoplay","muted","loop","playsinline"].forEach((a)=>video.setAttribute(a,""));
      video.style.cssText="width:100%;height:100%;object-fit:cover;display:block;";
      camada.appendChild(video);
    }
    if(window.getComputedStyle(element).position==="static")element.style.position="relative";
    element.style.overflow="hidden";
    stripPlaceholders(element);
    Array.from(element.children).forEach((filho)=>{if(isUi(filho))return;const s=window.getComputedStyle(filho);if(s.position==="static")filho.style.position="relative";if(!filho.style.zIndex)filho.style.zIndex="1";});
    element.insertBefore(camada,element.firstChild);
  }
  function stripPlaceholders(element){if(!element)return;element.querySelectorAll('[class*="placeholder" i]').forEach((node)=>node.remove());const remaining=Array.from(element.children).filter((child)=>!isUi(child));if(remaining.length===1&&remaining[0].tagName==="I"&&Array.from(remaining[0].classList).some((name)=>name.startsWith("ti-")))remaining[0].remove();}
  function deleteSelected(){if(!selected)return;const next=selected.parentElement;selected.remove();selected=null;changed();if(next&&!ignoredTags.has(next.tagName))select(next);}
  function duplicateSelected(){if(!selected)return;const copy=selected.cloneNode(true);copy.removeAttribute("data-ce-selected");copy.querySelectorAll("[data-ce-id]").forEach((node)=>node.removeAttribute("data-ce-id"));copy.removeAttribute("data-ce-id");selected.after(copy);changed();select(copy);}
  function runAction(action){contextMenu.style.display="none";if(action==="edit")select(selected);if(action==="parent"&&selected?.parentElement!==document.body)select(selected.parentElement);if(action==="duplicate")duplicateSelected();if(action==="delete")deleteSelected();if(action==="before")insertWidget("container",{target:selected,position:"before"});if(action==="after")insertWidget("container",{target:selected,position:"after"});}
  function serialize(){const clone=document.documentElement.cloneNode(true);clone.querySelectorAll("[data-ce-id],[data-ce-selected],[data-ce-hover],[data-ce-drop-inside]").forEach((node)=>{node.removeAttribute("data-ce-id");node.removeAttribute("data-ce-selected");node.removeAttribute("data-ce-hover");node.removeAttribute("data-ce-drop-inside");});clone.querySelectorAll("[data-ce-ui],#ce-editor-style,#ce-editor-bridge").forEach((node)=>node.remove());return "<!DOCTYPE html>\\n"+clone.outerHTML;}
  function rgbToHex(value,fallback){const match=String(value).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/);if(!match||Number(match[4])===0)return fallback;return"#"+[match[1],match[2],match[3]].map((part)=>Number(part).toString(16).padStart(2,"0")).join("");}
  function normalizeStyleValue(name,value){const raw=String(value??"").trim();const pixelProperties=new Set(["fontSize","letterSpacing","borderWidth","borderRadius","width","maxWidth","minHeight","height","gap","padding","margin","top","right","bottom","left"]);return raw&&pixelProperties.has(name)?raw.replace(/(^|\\s)(-?\\d+(?:\\.\\d+)?)(?=\\s|$)/g,"$1$2px"):raw;}

  assignIds();sendTree();
  document.addEventListener("click",(event)=>{const action=event.target.closest?.("[data-action]")?.dataset.action;if(action&&isUi(event.target)){event.preventDefault();event.stopPropagation();runAction(action);return;}const widget=event.target.closest?.("[data-widget]")?.dataset.widget;if(widget&&isUi(event.target)){event.preventDefault();event.stopPropagation();insertWidget(widget,{target:selected||currentTarget(),position:canContain(selected||currentTarget())?"inside":"after"});return;}if(event.target.closest?.("#ce-quick-button")){event.preventDefault();event.stopPropagation();quickWrap.classList.toggle("open");return;}contextMenu.style.display="none";quickWrap.classList.remove("open");const target=event.target.closest?.("[data-ce-id]");if(!target)return;event.preventDefault();event.stopPropagation();select(target);},true);
  document.addEventListener("contextmenu",(event)=>{const target=event.target.closest?.("[data-ce-id]");if(!target||isUi(target))return;event.preventDefault();select(target);contextMenu.style.display="block";contextMenu.style.left=Math.min(event.clientX,window.innerWidth-205)+"px";contextMenu.style.top=Math.min(event.clientY,window.innerHeight-240)+"px";},true);
  document.addEventListener("mouseover",(event)=>{const target=event.target.closest?.("[data-ce-id]");if(target&&target!==selected&&!isUi(target))target.dataset.ceHover="true";},true);
  document.addEventListener("mouseout",(event)=>{const target=event.target.closest?.("[data-ce-id]");if(target)target.removeAttribute("data-ce-hover");},true);
  document.addEventListener("dragover",(event)=>{event.preventDefault();event.dataTransfer.dropEffect="copy";showDrop(resolveDrop(event));});
  document.addEventListener("dragleave",(event)=>{if(!event.relatedTarget)clearDrop();});
  document.addEventListener("drop",(event)=>{event.preventDefault();const type=event.dataTransfer.getData("text/casa-estampa-widget")||window.parent.__CE_DRAG_WIDGET||"container";insertWidget(type,dropState||resolveDrop(event));window.parent.__CE_DRAG_WIDGET=null;});
  window.addEventListener("scroll",positionSelectionUi,{passive:true});window.addEventListener("resize",positionSelectionUi);
  window.addEventListener("message",(event)=>{const data=event.data||{};if(data.type==="ce-request-html")window.parent.postMessage({type:"ce-html",html:serialize()},"*");if(data.type==="ce-add-widget")insertWidget(data.widget,{target:currentTarget(),position:canContain(currentTarget())?"inside":"after"});if(data.type==="ce-add-photo"&&selected){let node;if(selected.lastElementChild){node=selected.lastElementChild.cloneNode(true);node.removeAttribute("data-ce-id");node.querySelectorAll("[data-ce-id]").forEach((child)=>child.removeAttribute("data-ce-id"));}else{node=makeWidget("image");}selected.appendChild(node);changed();node.scrollIntoView({behavior:"smooth",block:"center",inline:"end"});}if(data.type==="ce-select-id")select(document.querySelector('[data-ce-id="'+data.id+'"]'));if(!selected)return;if(data.type==="ce-select-parent"&&selected.parentElement!==document.body)select(selected.parentElement);if(data.type==="ce-html-content"){selected.innerHTML=data.value||"";changed();select(selected);}if(data.type==="ce-icon"){Array.from(selected.classList).filter((name)=>name.startsWith("ti-")).forEach((name)=>selected.classList.remove(name));selected.classList.add("ti",data.iconName);changed(false);select(selected);}if(data.type==="ce-attr"){if(data.name==="src"&&["VIDEO","AUDIO"].includes(selected.tagName)){let source=selected.querySelector("source");if(!source){source=document.createElement("source");selected.appendChild(source);}source.setAttribute("src",data.value||"");selected.load?.();}else if(data.value)selected.setAttribute(data.name,data.value);else selected.removeAttribute(data.name);changed();select(selected);}if(data.type==="ce-style"){selected.style[data.name]=normalizeStyleValue(data.name,data.value);if(data.name==="backgroundImage"&&data.value&&data.value!=="none")stripPlaceholders(selected);changed(false);}if(data.type==="ce-styles"){Object.entries(data.styles||{}).forEach(([name,value])=>{selected.style[name]=normalizeStyleValue(name,value);});if(data.styles?.backgroundImage&&data.styles.backgroundImage!=="none")stripPlaceholders(selected);changed(false);}if(data.type==="ce-bg-video"){setBgVideo(selected,data.tipo,data.src);changed(false);select(selected);}if(data.type==="ce-bg-video-remove"){removeBgVideo(selected);changed(false);select(selected);}if(data.type==="ce-delete")deleteSelected();if(data.type==="ce-duplicate")duplicateSelected();});
  window.addEventListener("message",(event)=>{
    const data=event.data||{};
    if(!selected||selected.dataset.ceWidget!=="carousel")return;
    if(data.type==="ce-carousel-add-images"){
      const sample=carouselItems(selected).at(-1);
      (data.paths||[]).forEach((src)=>{
        const node=sample?sample.node.cloneNode(true):makeWidget("image");
        node.removeAttribute("data-ce-id");node.querySelectorAll("[data-ce-id]").forEach((child)=>child.removeAttribute("data-ce-id"));
        const image=node.tagName==="IMG"?node:node.querySelector("img");
        if(!sample)image.style.cssText="display:block;flex:0 0 min(320px,80vw);width:min(320px,80vw);aspect-ratio:4/3;object-fit:cover;";
        image.setAttribute("src",src);
        image.setAttribute("alt","");
        selected.appendChild(node);
      });
      changed();select(selected);
    }
    if(data.type==="ce-carousel-update-image"){
      const image=carouselItems(selected)[data.index]?.image;
      if(image&&["src","alt"].includes(data.name)){image.setAttribute(data.name,data.value||"");changed(false);select(selected);}
    }
    if(data.type==="ce-carousel-remove-image"){
      carouselItems(selected)[data.index]?.node.remove();changed();select(selected);
    }
    if(data.type==="ce-carousel-move-image"){
      const items=carouselItems(selected);const item=items[data.index]?.node;const target=items[data.index+data.direction]?.node;
      if(item&&target){if(data.direction<0)selected.insertBefore(item,target);else selected.insertBefore(target,item);changed();select(selected);}
    }
  });
})();
</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${bridge}\n</body>`) : `${html}\n${bridge}`;
}
