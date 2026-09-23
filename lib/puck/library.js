"use client";

/*
 * Biblioteca de blocos Puck — páginas institucionais (pisos, arquitetos, ...).
 * Cada bloco replica 1:1 o markup do ar (incl. inline styles editoriais);
 * o CSS vem do <style> original da página (/puck/<pagina>.css).
 * Regra: arrays de 1 nível só (sem array dentro de array).
 */

import { useEffect, useRef, useState } from "react";
import { googleFontsStylesheet } from "../editor-options.js";

export const WA = "https://api.whatsapp.com/send?phone=5521999886842";
export const PUCK_FONTS = ["Cormorant Garamond", "EB Garamond", "Great Vibes", "Italiana", "Montserrat", "Roboto"];

/** root.render por página: CSS da página + globais + fontes + ícones no iframe. */
export function makeRootRender(cssHref) {
  return function PuckRoot({ children }) {
    return (
      <>
        <link rel="stylesheet" href={cssHref} />
        <link rel="stylesheet" href="/puck/global.css" />
        <link rel="stylesheet" href={googleFontsStylesheet(PUCK_FONTS)} />
        <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
        {/* cabeçalho único + hero desktop: precisam ser os últimos stylesheets */}
        <link id="casa-estampa-navbar" rel="stylesheet" href="/puck/navbar.css" />
        <link id="casa-estampa-hero" rel="stylesheet" href="/puck/hero.css" />
        {children}
      </>
    );
  };
}

export function Btn({ href, className, icon, label }) {
  return (
    <a href={href || "#"} className={className}>
      {icon ? <i className={`ti ${icon}`} aria-hidden="true" /> : null} {label}
    </a>
  );
}

/* ── HERO FOTO (pisos: capa full-bleed, título visível marrom) ── */
export function HeroFoto({ bgImage, bgWord, showLabel, showTitle, showSub, label, titleA, meio, highlight, titleB, sub, primaryLabel, primaryHref, primaryIcon, secondaryLabel, secondaryHref, secondaryIcon }) {
  const on = (v) => v === "yes";
  return (
    <section
      className="hero"
      style={bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
    >
      {bgWord ? <div className="hero-bg-word">{bgWord}</div> : null}
      {on(showLabel) && label ? <span className="hero-label" style={{ fontSize: 16, fontWeight: 700, color: "#f3d4a5" }}>{label}</span> : null}
      {on(showTitle) ? (
      <h1 className="hero-title" style={{ color: "#87580d", fontWeight: 700, fontSize: 66 }}>
        {titleA}
        {highlight ? (
          <>
            <br />
            {meio ? `${meio} ` : ""}
            <em style={{ color: "#e1a54c" }}>{highlight}</em>
          </>
        ) : null}
        {titleB ? (
          <>
            <br />
            {titleB}
          </>
        ) : null}
      </h1>
      ) : null}
      {on(showSub) && sub ? <p className="hero-subtitle" style={{ fontWeight: 700, fontSize: 25, color: "#87580d" }}>{sub}</p> : null}
      <div className="hero-actions">
        {primaryLabel ? <Btn href={primaryHref} className="btn-primary" icon={primaryIcon || "ti-grid-3x3"} label={primaryLabel} /> : null}
        {secondaryLabel ? <Btn href={secondaryHref} className="btn-ghost" icon={secondaryIcon || "ti-brand-whatsapp"} label={secondaryLabel} /> : null}
      </div>
    </section>
  );
}

/* ── DIFERENCIAIS (head + lista numerada) ── */
export function Diferenciais({ eyebrow, title, highlight, desc, items }) {
  return (
    <section className="diferenciais">
      <div className="dif-head">
        <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
        <h2 className="block-title">
          {title}
          {highlight ? (
            <>
              <br />
              <em>{highlight}</em>
            </>
          ) : null}
        </h2>
        <div className="section-divider" />
        {desc ? <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 380 }}>{desc}</p> : null}
      </div>
      <div className="dif-list">
        {(items || []).map((item, i) => (
          <div key={i} className="dif-item">
            <span className="dif-num">{item.num}</span>
            <div className="dif-text-wrap">
              <span className="dif-nome">{item.nome}</span>
              <span className="dif-desc">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── TIPOS (cards) ── */
export function TiposCards({ eyebrow, title, highlight, items }) {
  return (
    <section className="tipos" id="tipos">
      <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
      <h2 className="block-title">
        {title}
        {highlight ? (
          <>
            <br />
            <em>{highlight}</em>
          </>
        ) : null}
      </h2>
      <div className="tipos-grid">
        {(items || []).map((item, i) => (
          <div key={i} className="tipo-card">
            <div className="tipo-icon">
              <i className={`ti ${item.icon || "ti-layout-grid"}`} aria-hidden="true" />
            </div>
            <span className="tipo-tag" style={{ fontSize: 14, fontWeight: 700 }}>{item.tag}</span>
            <h3 className="tipo-nome" style={{ fontSize: 22 }}>{item.nome}</h3>
            <p className="tipo-desc">{item.desc}</p>
            <span className="tipo-badge" style={{ fontSize: 10, fontWeight: 600 }}>{item.badge}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── TABELA COMPARATIVA ── */
export function TabelaComp({ eyebrow, title, highlight, columns, rows }) {
  const cols = columns || [];
  return (
    <section className="comparativo">
      <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
      <h2 className="block-title">
        {title}
        {highlight ? (
          <>
            <br />
            <em>{highlight}</em>
          </>
        ) : null}
      </h2>
      <table className="comp-table">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, i) => {
            const cells = String(row.valores || "").split("\n").map((s) => s.trim());
            const strong = new Set(String(row.fortes || "").split(",").map((s) => s.trim()).filter(Boolean));
            return (
              <tr key={i}>
                <td className="tipo-col">{row.tipo}</td>
                {cells.slice(0, 4).map((cell, j) =>
                  j === 3 ? (
                    <td key={j}>{cell}</td>
                  ) : (
                    <td key={j}>
                      <span className={strong.has(String(j + 1)) ? "comp-tag high" : "comp-tag"}>{cell}</span>
                    </td>
                  )
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ── MOSTRUÁRIO (marcas + vídeo + fotos) ── */
function VideoBox({ src }) {
  // Igual ao ar: a caixa adota o formato real do vídeo (retrato fica alto).
  // Cobre metadados que já chegaram (cache) e os que chegam depois.
  const vref = useRef(null);
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const apply = () => {
      if (v.videoWidth && v.videoHeight) setRatio(`${v.videoWidth} / ${v.videoHeight}`);
    };
    apply();
    v.addEventListener("loadedmetadata", apply);
    v.addEventListener("loadeddata", apply);
    v.addEventListener("canplay", apply);
    return () => {
      v.removeEventListener("loadedmetadata", apply);
      v.removeEventListener("loadeddata", apply);
      v.removeEventListener("canplay", apply);
    };
  }, [src]);
  return (
    <div className="media-video-box" style={ratio ? { aspectRatio: ratio, height: "auto" } : undefined}>
      {src ? (
        <video
          ref={vref}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src={src}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <div className="media-video-placeholder">
          <i className="ti ti-player-play" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function Mostruario({ eyebrow, title, tituloGrande, desc, brands, ctaLabel, ctaHref, video, videoCaption, photos }) {
  return (
    <section className="mostruario">
      <div className="mostruario-inner">
        <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
        <h2 className="block-title" style={tituloGrande === "yes" ? { fontSize: 45, fontWeight: 700 } : undefined}>
          {title}
        </h2>
        <div className="section-divider" />
        {desc ? <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 28 }}>{desc}</p> : null}
        {(brands || []).length ? (
          <div className="mostruario-brands">
            {brands.map((brand, i) => (
              <div key={i} className="brand-item">
                <div className="brand-item-left">
                  <span className="brand-dot" />
                  <span className="brand-name">{brand.name}</span>
                </div>
                {brand.href ? (
                  <a href={brand.href} className="brand-link" style={{ fontWeight: 700, fontSize: 10 }}>
                    <i className="ti ti-eye" aria-hidden="true" /> Ver mostruário
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {ctaLabel ? (
          <div className="mostruario-actions">
            <a href={ctaHref || WA} className="btn-ghost">{ctaLabel}</a>
          </div>
        ) : null}
      </div>
      <div className="mostruario-media">
        <div className="mostruario-media-video">
          <VideoBox src={video} />
          {videoCaption ? <div className="media-caption" style={{ fontSize: 17, fontWeight: 600 }}>{videoCaption}</div> : null}
        </div>
        {(photos || []).length ? (
          <div className="media-fotos">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="media-foto"
                style={
                  photo.fundo === "yes" && photo.src
                    ? {
                        backgroundImage: `url('${photo.src}')`,
                        backgroundSize: photo.modo === "contain" ? "contain" : "cover",
                        backgroundPosition: photo.modo === "contain" ? "center top" : "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                {photo.fundo !== "yes" && photo.src ? (
                  <img src={photo.src} alt={photo.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── GALERIA COM ABAS (instalações) ── */
export function GaleriaTabs({ eyebrow, title, highlight, tabs, photos }) {
  const list = tabs && tabs.length ? tabs : [{ id: "todos", label: "Todos" }];
  const [active, setActive] = useState(list[0].id);
  const visible = (photos || []).filter((p) => !p.tab || p.tab === active);
  return (
    <section className="instalacoes">
      <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
      <h2 className="block-title">
        {title}
        {highlight ? (
          <>
            <br />
            <em>{highlight}</em>
          </>
        ) : null}
      </h2>
      <div className="inst-tabs">
        {list.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`inst-tab${active === tab.id ? " active" : ""}`}
            style={{ fontWeight: 700 }}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="inst-grid">
        {visible.map((photo, i) => (
          <div key={i} className="inst-foto">
            {photo.src ? (
              <img src={photo.src} alt={photo.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <i className="ti ti-photo" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── PASSOS (processo) ── */
export function Passos({ eyebrow, title, highlight, sub, items }) {
  return (
    <section className="processo">
      <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{eyebrow}</span>
      <h2 className="block-title">
        {title}
        {highlight ? (
          <>
            <br />
            <em>{highlight}</em>
          </>
        ) : null}
      </h2>
      {sub ? <p className="block-sub">{sub}</p> : null}
      <div className="proc-steps">
        {(items || []).map((item, i) => (
          <div key={i} className="proc-step">
            <div className="proc-num">{item.num}</div>
            <h3 className="proc-title">{item.nome}</h3>
            <p className="proc-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA PISOS (segmentos + telefone) ── */
export function CtaPisos({ bgWord, label, titleA, meio, highlight, titleB, desc, primaryLabel, primaryHref, secondaryLabel, secondaryHref, segs, phone }) {
  return (
    <section className="cta-final">
      {bgWord ? <div className="cta-bg">{bgWord}</div> : null}
      <div className="cta-left">
        <span className="block-label" style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <h2 className="cta-title">
          {titleA}
          {highlight ? (
            <>
              <br />
              {meio ? `${meio} ` : ""}
              <em>{highlight}</em>
            </>
          ) : null}
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
          {secondaryLabel ? <Btn href={secondaryHref} className="btn-ghost" label={secondaryLabel} /> : null}
        </div>
      </div>
      <div className="cta-right">
        <div className="cta-segs">
          {(segs || []).map((seg, i) => (
            <div key={i} className="cta-seg" style={{ fontSize: 14, fontWeight: 700 }}>{seg.label}</div>
          ))}
        </div>
        {phone ? (
          <p style={{ fontSize: 18, color: "var(--text-dim)", marginTop: 16, letterSpacing: 1 }}>
            <i className="ti ti-phone" aria-hidden="true" /> {phone}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const passoFields = {
  num: { type: "text", label: "Número" },
  nome: { type: "text", label: "Título" },
  desc: { type: "textarea", label: "Descrição" },
};
