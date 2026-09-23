"use client";

/*
 * Puck config — Home Casa Estampa (v2).
 * CSS: /puck/home.css (o <style> original da home) + /puck/global.css
 * (as regras globais que o renderHtml injeta no ar). Mesma ordem do
 * produção: página primeiro, globais depois. Só texto/imagem/link/ordem
 * são editáveis — estrutura travada (impede bug mobile/desktop).
 */

import { useState } from "react";
import { googleFontsStylesheet } from "../editor-options.js";

const PUCK_FONTS = ["Cormorant Garamond", "EB Garamond", "Great Vibes", "Italiana", "Montserrat", "Roboto"];

const WA = "https://api.whatsapp.com/send?phone=5521999886842";

function Btn({ href, className, icon, label }) {
  return (
    <a href={href || "#"} className={className}>
      {icon ? <i className={`ti ${icon}`} aria-hidden="true" /> : null} {label}
    </a>
  );
}

/* ── HERO ── */
function Hero({ bgImage, bgImageMobile, logoImage, showTitle, showSub, label, title, highlight, sub, primaryLabel, primaryHref, secondaryLabel, secondaryHref }) {
  return (
    <section className="hero">
      {/* No mobile a capa retrato tem que entrar na camada visível (.hero-bg),
          senão a capa paisagem (desktop) continua por cima e o texto corta. */}
      {bgImageMobile ? <style>{`@media(max-width:768px){.hero,.hero .hero-bg{background-image:url('${bgImageMobile}')!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;}}`}</style> : null}
      <div className="hero-bg" style={bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined} />
      <div className="hero-content">
        {logoImage ? (
          <img
            src={logoImage}
            alt="Casa Estampa Interiores"
            style={{ width: "min(560px,86vw)", height: "auto", marginBottom: 18, filter: "drop-shadow(0 6px 22px rgba(0,0,0,.45))" }}
          />
        ) : null}
        {/* Respiro 96px: no ar há um container fantasma do editor antigo;
            replicado como espaço limpo para a mesma altura. */}
        <div style={{ height: 96 }} aria-hidden="true" />
        {showTitle ? (
          <h1 className="hero-title">
            {title}
            {highlight ? (
              <>
                <br />
                <em>{highlight}</em>
              </>
            ) : null}
          </h1>
        ) : null}
        {label ? <span className="hero-label">{label}</span> : null}
        {showSub && sub ? <p className="hero-sub">{sub}</p> : null}
        <div className="hero-actions">
          {primaryLabel ? <Btn href={primaryHref} className="btn-primary" icon="ti-sparkles" label={primaryLabel} /> : null}
          {secondaryLabel ? <Btn href={secondaryHref} className="btn-ghost" icon="ti-brand-whatsapp" label={secondaryLabel} /> : null}
        </div>
      </div>
    </section>
  );
}

/* ── CATEGORIAS ── */
function Categorias({ label, title, highlight, items }) {
  return (
    <section className="categorias" id="categorias">
      <div className="section-header">
        {label ? <span className="block-label">{label}</span> : null}
        <h2 className="block-title">
          {title}
          {highlight ? (
            <>
              <br />
              <em>{highlight}</em>
            </>
          ) : null}
        </h2>
      </div>
      <div className="cat-grid">
        {(items || []).map((item, i) => (
          <a
            key={i}
            href={item.href || "#"}
            className="cat-card"
            style={item.photo ? { backgroundImage: `url('${item.photo}')` } : undefined}
          >
            {item.photo ? <span className="cat-veil" /> : null}
            <span className="cat-card-inner">
              <i className={`ti ${item.icon || "ti-photo"} cat-icon`} aria-hidden="true" />
              <span className="cat-nome">{item.nome}</span>
              <p className="cat-desc">{item.desc}</p>
              <span className="cat-link" style={{ fontWeight: 700, color: "#f5eed8" }}>
                {item.linkLabel} <i className="ti ti-arrow-right" aria-hidden="true" />
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── POR QUE (grade de fotos + diferenciais, igual ao ar) ── */
function Porque({ eyebrow, label, title, highlight, photos, items }) {
  return (
    <section className="porque">
      <div>
        <span className="block-label" style={{ marginBottom: 20 }}>{eyebrow}</span>
        <div className="carousel-wrap">
          <div className="carousel-track">
            {(photos || []).map((photo, i) => (
              <div key={i} className="carousel-foto">
                {photo.src ? <img src={photo.src} alt={photo.alt || ""} /> : <i className="ti ti-photo" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <span className="block-label">{label}</span>
        <h2 className="block-title">
          {title}
          {highlight ? (
            <>
              <br />
              <em>{highlight}</em>
            </>
          ) : null}
        </h2>
        <div className="porque-items">
          {(items || []).map((item, i) => (
            <div key={i} className="porque-item">
              <span className="porque-check">
                <i className="ti ti-check" aria-hidden="true" />
              </span>
              <div className="porque-text">
                <span className="porque-nome">{item.nome}</span>
                <span className="porque-desc">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ (abre/fecha sem JS global) ── */
function Faq({ label, title, highlight, intro, items }) {
  const [open, setOpen] = useState(-1);
  return (
    <section className="faq">
      <div className="faq-head">
        <span className="block-label">{label}</span>
        <h2 className="block-title">
          {title}
          {highlight ? (
            <>
              <br />
              <em>{highlight}</em>
            </>
          ) : null}
        </h2>
        {intro ? <p className="faq-intro">{intro}</p> : null}
      </div>
      <div className="faq-list">
        {(items || []).map((item, i) => (
          <div key={i} className="faq-item">
            <button type="button" className={`faq-q${open === i ? " open" : ""}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              {item.q}
              <i className="ti ti-plus faq-icon" aria-hidden="true" />
            </button>
            <div className={`faq-a${open === i ? " open" : ""}`}>{item.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA FINAL ── */
function CtaFinal({ bgWord, label, titleA, highlight, titleB, desc, primaryLabel, primaryHref, secondaryLabel, secondaryHref, infos }) {
  return (
    <section className="cta-final">
      <div className="cta-bg-word">{bgWord}</div>
      <div>
        <span className="block-label">{label}</span>
        <h2 className="cta-title">
          <span style={{ whiteSpace: "nowrap" }}>
            {titleA} {highlight ? <em>{highlight}</em> : null}
          </span>
          {titleB ? (
            <>
              <br />
              {titleB}
            </>
          ) : null}
        </h2>
        {desc ? <p className="cta-desc">{desc}</p> : null}
        <div className="cta-actions">
          {primaryLabel ? <Btn href={primaryHref} className="btn-primary" icon="ti-brand-whatsapp" label={primaryLabel} /> : null}
          {secondaryLabel ? <Btn href={secondaryHref} className="btn-ghost" icon="ti-sparkles" label={secondaryLabel} /> : null}
        </div>
      </div>
      <div className="cta-right">
        {(infos || []).map((info, i) => (
          <div key={i} className="cta-info">
            <i className={`ti ${info.icon || "ti-info-circle"}`} aria-hidden="true" />
            <div className="cta-info-text">
              <span className="cta-info-title">{info.title}</span>
              <span className="cta-info-sub">{info.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── FAIXA ATENDIMENTO ── */
function Faixa({ text }) {
  return (
    <section className="atende-sep">
      <p>{text}</p>
    </section>
  );
}

/* ── CLIENTES ── */
function Clientes({ label, title, highlight, logos }) {
  return (
    <section className="clientes">
      <div className="section-header" style={{ textAlign: "center", marginBottom: 40 }}>
        <span className="block-label" style={{ justifyContent: "center" }}>{label}</span>
        <h2 className="block-title">
          {title} {highlight ? <em>{highlight}</em> : null}
        </h2>
      </div>
      <div className="clientes-grid">
        {(logos || []).map((logo, i) => (
          <img
            key={i}
            src={logo.src}
            alt={logo.alt || ""}
            style={logo.chip === "yes" ? { background: "#fff", borderRadius: 10, padding: 18 } : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/* ── DEPOIMENTOS ── */
function Depoimentos({ label, title, highlight, items }) {
  return (
    <section className="depoimentos">
      <span className="block-label">{label}</span>
      <h2 className="block-title">
        {title}
        {highlight ? (
          <>
            <br />
            <em>{highlight}</em>
          </>
        ) : null}
      </h2>
      <div className="dep-grid">
        {(items || []).map((item, i) => (
          <div key={i} className="dep-card">
            <div className="dep-stars">★★★★★</div>
            <p className="dep-text">&ldquo;{item.text}&rdquo;</p>
            <div className="dep-author">
              <span className="dep-name">{item.name}</span>
              <span className="dep-meta">{item.meta}</span>
              <div className="dep-google">
                <span className="dep-google-dot" style={{ background: "#4285F4" }} />
                <span className="dep-google-dot" style={{ background: "#EA4335" }} />
                <span className="dep-google-dot" style={{ background: "#FBBC05" }} />
                <span className="dep-google-dot" style={{ background: "#34A853" }} />
                <span className="dep-google-label">Google</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const catItemFields = {
  photo: { type: "text", label: "Foto do card (URL ou /uploads/…)" },
  icon: { type: "text", label: "Ícone (classe ti …)" },
  nome: { type: "text", label: "Nome" },
  desc: { type: "textarea", label: "Descrição" },
  linkLabel: { type: "text", label: "Texto do link" },
  href: { type: "text", label: "Destino do link" },
};

export const puckHomeConfig = {
  cssHref: "/puck/blocks.css",
  root: {
    fields: {
      title: { type: "text", label: "Título da página (SEO)" },
    },
    defaultProps: { title: "Casa Estampa — Interiores de Alto Padrão" },
    // O canvas do editor é um iframe isolado: a página + globais + fontes +
    // ícones entram AQUI para o editor mostrar o visual real (e o Render
    // público herda exatamente igual). Ordem igual ao ar: página, depois globais.
    render: ({ children }) => (
      <>
        <link rel="stylesheet" href="/puck/blocks.css" />
        <link rel="stylesheet" href="/puck/global.css" />
        <link rel="stylesheet" href={googleFontsStylesheet(PUCK_FONTS)} />
        <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
        <div className="ce-puck-scope">{children}</div>
      </>
    ),
  },
  components: {
    Hero: {
      label: "Hero (capa + botões)",
      fields: {
        bgImage: { type: "text", label: "Foto de fundo (URL ou /uploads/…)" },
        bgImageMobile: { type: "text", label: "Foto de fundo no celular (opcional)" },
        logoImage: { type: "text", label: "Logo sobre a capa (vazio = sem logo)" },
        showTitle: {
          type: "select",
          label: "Exibir título em texto?",
          options: [
            { label: "Não (texto já está na foto)", value: "no" },
            { label: "Sim", value: "yes" },
          ],
        },
        showSub: {
          type: "select",
          label: "Exibir subtítulo em texto?",
          options: [
            { label: "Não (texto já está na foto)", value: "no" },
            { label: "Sim", value: "yes" },
          ],
        },
        label: { type: "text", label: "Etiqueta pequena" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque do título (itálico dourado)" },
        sub: { type: "text", label: "Subtítulo" },
        primaryLabel: { type: "text", label: "Botão 1 — texto" },
        primaryHref: { type: "text", label: "Botão 1 — destino" },
        secondaryLabel: { type: "text", label: "Botão 2 — texto" },
        secondaryHref: { type: "text", label: "Botão 2 — destino" },
      },
      defaultProps: {
        bgImage: "/uploads/capas/home.jpg",
        bgImageMobile: "/uploads/capas/mobile/home.jpg?v=20260921",
        logoImage: "/assets/logo-letra.svg",
        showTitle: "no",
        showSub: "no",
        label: "",
        title: "Casa Estampa",
        highlight: "Interiores",
        sub: "Transformamos seus ambientes em experiências memoráveis",
        primaryLabel: "Ver inspirações",
        primaryHref: "#categorias",
        secondaryLabel: "Pedir orçamento",
        secondaryHref: WA,
      },
      render: (props) => <Hero {...props} showTitle={props.showTitle === "yes"} showSub={props.showSub === "yes"} />,
    },
    Categorias: {
      label: "Categorias (5 cards)",
      fields: {
        label: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        items: {
          type: "array",
          label: "Cards",
          getItemSummary: (item) => item.nome || "Card",
          arrayFields: catItemFields,
        },
      },
      defaultProps: { label: "", title: "", highlight: "", items: [] },
      render: (props) => <Categorias {...props} />,
    },
    Faixa: {
      label: "Faixa (frase de atendimento)",
      fields: {
        text: { type: "textarea", label: "Frase" },
      },
      defaultProps: { text: "Atendemos clientes particulares, arquitetos e corporativos." },
      render: (props) => <Faixa {...props} />,
    },
    Clientes: {
      label: "Clientes (logos)",
      fields: {
        label: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        logos: {
          type: "array",
          label: "Logos",
          getItemSummary: (item) => item.alt || "Logo",
          arrayFields: {
            src: { type: "text", label: "Imagem (URL ou /assets/…)" },
            alt: { type: "text", label: "Nome do cliente" },
            chip: {
              type: "select",
              label: "Placa clara (logo escura)?",
              options: [
                { label: "Não", value: "no" },
                { label: "Sim (fundo branco)", value: "yes" },
              ],
            },
          },
        },
      },
      defaultProps: { label: "", title: "", highlight: "", logos: [] },
      render: (props) => <Clientes {...props} />,
    },
    Porque: {
      label: "Por que (fotos + diferenciais)",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta das fotos" },
        label: { type: "text", label: "Etiqueta do texto" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        photos: {
          type: "array",
          label: "Fotos",
          getItemSummary: (_, i) => `Foto ${i + 1}`,
          arrayFields: {
            src: { type: "text", label: "Imagem (URL ou /uploads/…)" },
            alt: { type: "text", label: "Texto alternativo" },
          },
        },
        items: {
          type: "array",
          label: "Diferenciais",
          getItemSummary: (item) => item.nome || "Item",
          arrayFields: {
            nome: { type: "text", label: "Título" },
            desc: { type: "textarea", label: "Descrição" },
          },
        },
      },
      defaultProps: { eyebrow: "", label: "", title: "", highlight: "", photos: [], items: [] },
      render: (props) => <Porque {...props} />,
    },
    Faq: {
      label: "FAQ (perguntas)",
      fields: {
        label: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        intro: { type: "textarea", label: "Texto de apoio" },
        items: {
          type: "array",
          label: "Perguntas",
          getItemSummary: (item) => item.q || "Pergunta",
          arrayFields: {
            q: { type: "text", label: "Pergunta" },
            a: { type: "textarea", label: "Resposta" },
          },
        },
      },
      defaultProps: { label: "", title: "", highlight: "", intro: "", items: [] },
      render: (props) => <Faq {...props} />,
    },
    CtaFinal: {
      label: "CTA final (orçamento)",
      fields: {
        bgWord: { type: "text", label: "Palavra de fundo" },
        label: { type: "text", label: "Etiqueta" },
        titleA: { type: "text", label: "Título (antes do destaque)" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        titleB: { type: "text", label: "Título (linha de baixo)" },
        desc: { type: "textarea", label: "Descrição" },
        primaryLabel: { type: "text", label: "Botão 1 — texto" },
        primaryHref: { type: "text", label: "Botão 1 — destino" },
        secondaryLabel: { type: "text", label: "Botão 2 — texto" },
        secondaryHref: { type: "text", label: "Botão 2 — destino" },
        infos: {
          type: "array",
          label: "Selos de confiança",
          getItemSummary: (item) => item.title || "Selo",
          arrayFields: {
            icon: { type: "text", label: "Ícone (classe ti …)" },
            title: { type: "text", label: "Título" },
            sub: { type: "text", label: "Subtítulo" },
          },
        },
      },
      defaultProps: { bgWord: "Casa", label: "", titleA: "", highlight: "", titleB: "", desc: "", primaryLabel: "", primaryHref: WA, secondaryLabel: "", secondaryHref: "#categorias", infos: [] },
      render: (props) => <CtaFinal {...props} />,
    },
    Depoimentos: {
      label: "Depoimentos",
      fields: {
        label: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque (itálico dourado)" },
        items: {
          type: "array",
          label: "Depoimentos",
          getItemSummary: (item) => item.name || "Depoimento",
          arrayFields: {
            text: { type: "textarea", label: "Texto" },
            name: { type: "text", label: "Nome" },
            meta: { type: "text", label: "Bairro · Cidade" },
          },
        },
      },
      defaultProps: { label: "", title: "", highlight: "", items: [] },
      render: (props) => <Depoimentos {...props} />,
    },
  },
};
