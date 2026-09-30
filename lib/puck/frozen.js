"use client";

/*
 * Páginas "congeladas" no editor Puck.
 *
 * Cada seção é o markup ORIGINAL da página (mesmas tags/atributos → mesmo
 * layout e CSS). No canvas do editor (editMode) a seção é CLICÁVEL:
 *   • clique numa imagem → troca a foto (upload ou URL) + texto alternativo;
 *   • clique num texto simples → edita o texto (e o link do botão, se houver);
 *   • clique num link/botão → edita destino (+ texto, quando simples).
 * Elementos com formatação interna (spans/links aninhados) continuam via
 * campo "HTML da seção (avançado)". Fora do editor (Render/preview/site)
 * a saída é o HTML exato, sem nenhuma marca do editor.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registerOverlayPortal, usePuck } from "@measured/puck";
import { googleFontsStylesheet } from "../editor-options.js";
import { ImagemField } from "./fields.js";

const PUCK_FONTS = ["Cormorant Garamond", "EB Garamond", "Great Vibes", "Italiana", "Montserrat", "Roboto"];

/* ── Espelho do CSS de produção dentro do canvas ─────────────────────
 * A página no ar carrega (nesta ordem): estilos inline do head
 * (= public/puck/pages/<slug>.css), /assets/revisao/site.css (1,9MB),
 * tabler, navbar.css e hero.css. O canvas antes carregava só o primeiro
 * → preview divergia do site. O site.css entra com escopo
 * `.ce-frozen-scope` (prefixo de seletores, com `body`/`html`/`:root`
 * reescritos para o escopo) para não vazar no chrome do editor.
 * As classes do <body> de produção vão no wrapper (2º argumento).
 * Cache em memória: processa 1 vez por sessão.
 * ──────────────────────────────────────────────────────────────────── */

let siteCssCache = null;

function splitSelectors(sel) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of sel) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function scopeSelector(sel, scope) {
  return splitSelectors(sel)
    .map((s) => {
      s = s.trim();
      if (!s) return s;
      if (/^body\b/i.test(s)) return scope + s.slice(4);
      if (/^html\b/i.test(s)) return scope + s.slice(4);
      if (/^:root\b/i.test(s)) return scope + s.slice(5);
      return `${scope} ${s}`;
    })
    .join(", ");
}

function scopeCss(css, scope) {
  const src = String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  const verbatim = [];
  function parse(s) {
    let out = "";
    let i = 0;
    const n = s.length;
    const skipWs = () => {
      while (i < n && /\s/.test(s[i])) i++;
    };
    const readBlock = () => {
      // s[i] === "{" — lê até a chave de fechamento (ignora chaves em strings)
      let depth = 0;
      const start = i;
      let quote = null;
      while (i < n) {
        const ch = s[i];
        if (quote) {
          if (ch === "\\") i += 2;
          else {
            if (ch === quote) quote = null;
            i++;
          }
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          i++;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (!depth) {
            i++;
            return s.slice(start, i);
          }
        }
        i++;
      }
      return s.slice(start);
    };
    while (i < n) {
      skipWs();
      if (i >= n) break;
      if (s[i] === "}") {
        i++;
        continue;
      }
      if (s[i] === "@") {
        const m = /^@(media|supports|container|layer)[^{]*\{/.exec(s.slice(i));
        if (m) {
          const header = m[0];
          i += header.length - 1;
          const body = readBlock();
          out += `${header}${parse(body.slice(1, -1))}}`;
          continue;
        }
        // @font-face, @keyframes, @import…: copia como está (vale global, sem risco)
        const semi = s.indexOf(";", i);
        const brace = s.indexOf("{", i);
        if (brace !== -1 && (semi === -1 || brace < semi)) {
          const start = i;
          readBlock();
          verbatim.push(s.slice(start, i));
          continue;
        }
        if (semi !== -1) {
          verbatim.push(s.slice(i, semi + 1));
          i = semi + 1;
        } else break;
        continue;
      }
      const brace = s.indexOf("{", i);
      if (brace === -1) break;
      const sel = s.slice(i, brace).trim();
      i = brace;
      const block = readBlock();
      if (sel) out += `${scopeSelector(sel, scope)}${block}`;
    }
    return out;
  }
  // Ordem importa: parse() primeiro (preenche `verbatim`), só depois o join.
  const scoped = parse(src);
  return `${verbatim.join("\n")}\n${scoped}`;
}

function ScopedSiteCss() {
  useEffect(() => {
    let dead = false;
    async function run() {
      try {
        if (!siteCssCache) {
          const res = await fetch("/assets/revisao/site.css", { cache: "force-cache" });
          if (!res.ok) return;
          siteCssCache = scopeCss(await res.text(), ".ce-frozen-scope");
        }
        if (dead || document.getElementById("ce-site-scoped")) return;
        const st = document.createElement("style");
        st.id = "ce-site-scoped";
        st.textContent = siteCssCache;
        document.head.appendChild(st);
      } catch {}
    }
    run();
    return () => {
      dead = true;
    };
  }, []);
  return null;
}

const TEXTO_SELETOR = "h1,h2,h3,h4,h5,h6,p,li,button,figcaption,blockquote,span";

function isSimple(el) {
  return Array.from(el.children || []).every((c) => c.tagName === "BR");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Caminho do nó até a raiz (índices em childNodes) — refeito a cada clique. */
function pathOf(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const parent = cur.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
    cur = parent;
  }
  return cur === root ? path : null;
}

function nodeAt(root, path) {
  let cur = root;
  for (const i of path || []) {
    cur = cur?.childNodes?.[i];
    if (!cur) return null;
  }
  return cur;
}

/* Classifica o que foi clicado: imagem, texto simples, link ou avulso. */
function pick(box, target) {
  if (!target || !target.closest || !box.contains(target)) return null;
  const img = target.closest("img");
  if (img && box.contains(img)) {
    return { kind: "img", path: pathOf(img, box), src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "" };
  }
  const s = target.closest(TEXTO_SELETOR);
  if (s && box.contains(s)) {
    if (isSimple(s)) {
      const a = s.closest("a[href]");
      const link = a && box.contains(a) ? a : null;
      return {
        kind: "text",
        path: pathOf(s, box),
        tag: s.tagName.toLowerCase(),
        text: s.innerText ?? s.textContent ?? "",
        href: link ? link.getAttribute("href") || "" : null,
        linkPath: link ? pathOf(link, box) : null,
      };
    }
    const aDentro = target.closest("a[href]");
    if (aDentro && box.contains(aDentro)) {
      return { kind: "link", path: pathOf(aDentro, box), href: aDentro.getAttribute("href") || "", text: null };
    }
    return { kind: "avulso", tag: s.tagName.toLowerCase(), cls: (s.getAttribute("class") || "").slice(0, 80) };
  }
  const a = target.closest("a[href]");
  if (a && box.contains(a)) {
    const simple = isSimple(a);
    return {
      kind: "link",
      path: pathOf(a, box),
      href: a.getAttribute("href") || "",
      text: simple ? a.innerText ?? a.textContent ?? "" : null,
    };
  }
  return null;
}

/* Saída estática — usada no Render/preview e no site (sem editor). */
export function Secao({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    el.replaceWith(tpl.content);
  }, [html]);
  return <span ref={ref} style={{ display: "none" }} aria-hidden="true" />;
}

/* Versão editável — só existe dentro do canvas do Puck (tem provider). */
function SecaoEditavel({ id, rotulo, html }) {
  const { dispatch } = usePuck();
  const boxRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [mounted, setMounted] = useState(false);
  const lastHover = useRef(null);
  useEffect(() => setMounted(true), []);

  function salvar(novoHtml) {
    dispatch({
      type: "setData",
      data: (prev) => ({
        ...prev,
        content: (prev.content || []).map((item) =>
          item.id === id ? { ...item, props: { ...item.props, html: novoHtml } } : item
        ),
      }),
    });
  }

  function aplicar(valores) {
    const box = boxRef.current;
    if (!box || !sel?.path) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    const alvo = nodeAt(tpl.content, sel.path);
    if (!alvo || alvo.nodeType !== 1) return;
    if (sel.kind === "img") {
      if (valores.src !== undefined) alvo.setAttribute("src", valores.src);
      if (valores.alt !== undefined) alvo.setAttribute("alt", valores.alt);
    } else if (sel.kind === "text") {
      alvo.innerHTML = escapeHtml(valores.text).replace(/\n/g, "<br>");
      if (sel.linkPath && valores.href !== undefined && valores.href !== sel.href) {
        const link = nodeAt(tpl.content, sel.linkPath);
        if (link && link.nodeType === 1) link.setAttribute("href", valores.href);
      }
    } else if (sel.kind === "link") {
      if (valores.href !== undefined) alvo.setAttribute("href", valores.href);
      if (valores.text !== undefined && valores.text !== null) {
        alvo.innerHTML = escapeHtml(valores.text).replace(/\n/g, "<br>");
      }
    }
    const out = document.createElement("div");
    out.appendChild(tpl.content.cloneNode(true));
    salvar(out.innerHTML);
    setSel(null);
  }

  function onPick(e) {
    // Campos de formulário da própria página (ex: calculadora): não interceptar.
    if (e.target?.closest?.("input, textarea, select, option")) return;
    const found = pick(boxRef.current, e.target);
    e.preventDefault();
    clearHover();
    setSel(found);
  }

  function clearHover() {
    const el = lastHover.current;
    lastHover.current = null;
    if (el && el.isConnected) {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.cursor = "";
    }
  }

  function onHover(e) {
    const box = boxRef.current;
    if (!box || !e.target?.closest) return;
    const found = pick(box, e.target);
    const alvo = found && found.kind !== "avulso" ? nodeAt(box, found.path) : null;
    if (!alvo || alvo.nodeType !== 1 || alvo === lastHover.current) return;
    clearHover();
    alvo.style.outline = "2px dashed #c2a57a";
    alvo.style.outlineOffset = "2px";
    alvo.style.cursor = "pointer";
    lastHover.current = alvo;
  }

  return (
    <>
      <div
        ref={boxRef}
        onClickCapture={onPick}
        onMouseOverCapture={onHover}
        onMouseLeave={clearHover}
        style={{ position: "relative" }}
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
      <span className="ce-edit-badge">✎ clique num texto, botão ou imagem para editar</span>
      {sel && mounted
        ? createPortal(
            <PainelEdicao sel={sel} onAplicar={aplicar} onFechar={() => setSel(null)} />,
            document.body
          )
        : null}
      <style>{`
        .ce-edit-badge { display: inline-block; margin: 6px 0 2px; padding: 4px 10px; font: 600 11px/1.4 Arial, sans-serif; letter-spacing: .5px; color: #c2a57a; border: 1px dashed rgba(194,165,122,.6); border-radius: 20px; background: rgba(28,24,16,.85); pointer-events: none; }
      `}</style>
    </>
  );
}

function PainelEdicao({ sel, onAplicar, onFechar }) {
  const [text, setText] = useState(sel.text ?? "");
  const [href, setHref] = useState(sel.href ?? "");
  const [src, setSrc] = useState(sel.src ?? "");
  const [alt, setAlt] = useState(sel.alt ?? "");
  const panelRef = useRef(null);

  // API oficial do Puck para UI flutuante: o editor não sequestra os eventos do painel.
  useEffect(() => {
    if (!panelRef.current) return undefined;
    try {
      const cleanup = registerOverlayPortal(panelRef.current);
      return () => {
        try {
          if (typeof cleanup === "function") cleanup();
        } catch {}
      };
    } catch {
      return undefined;
    }
  }, []);

  const titulo =
    sel.kind === "img" ? "Editar imagem" : sel.kind === "text" ? `Editar texto (<${sel.tag}>)` : sel.kind === "link" ? "Editar link/botão" : "Elemento com formatação interna";

  return (
    <div ref={panelRef} className="ce-edit-panel" data-puck-overlay-portal="true">
      <strong>{titulo}</strong>
      {rotuloMini(sel)}
      {sel.kind === "img" ? (
        <>
          <ImagemField value={src} onChange={setSrc} />
          <label>
            Texto alternativo
            <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descreva a imagem" />
          </label>
        </>
      ) : null}
      {sel.kind === "text" ? (
        <>
          <label>
            Texto
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          {sel.href !== null && sel.href !== undefined ? (
            <label>
              Destino do botão/link
              <input type="text" value={href} onChange={(e) => setHref(e.target.value)} />
            </label>
          ) : null}
        </>
      ) : null}
      {sel.kind === "link" ? (
        <>
          <label>
            Destino
            <input type="text" value={href} onChange={(e) => setHref(e.target.value)} />
          </label>
          {sel.text !== null && sel.text !== undefined ? (
            <label>
              Texto
              <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          ) : (
            <p className="ce-edit-note">O texto deste botão está em partes internas — clique direto na palavra para editá-la, ou use o HTML avançado.</p>
          )}
        </>
      ) : null}
      {sel.kind === "avulso" ? (
        <p className="ce-edit-note">
          Este elemento tem formatação interna e não dá para editar por aqui sem quebrar o visual. Edite pelo campo “HTML da seção (avançado)” no painel da direita.
        </p>
      ) : null}
      <div className="ce-edit-actions">
        {sel.kind !== "avulso" ? (
          <button
            type="button"
            className="ce-edit-apply"
            onClick={() => onAplicar({ text, href, src, alt })}
          >
            Aplicar
          </button>
        ) : null}
        <button type="button" onClick={onFechar}>
          Fechar
        </button>
      </div>
      <style>{`
        .ce-edit-panel { position: fixed; top: 76px; right: 336px; z-index: 9999; width: 320px; max-width: calc(100vw - 380px); max-height: calc(100vh - 100px); overflow: auto; background: #1c1810; color: #f0e7d2; border: 1px solid rgba(194,165,122,.5); border-radius: 8px; padding: 14px; display: grid; gap: 10px; font-family: Arial, sans-serif; box-shadow: 0 18px 48px rgba(0,0,0,.5); }
        .ce-edit-panel strong { font-size: 13px; color: #c2a57a; }
        .ce-edit-panel label { display: grid; gap: 5px; font-size: 11px; color: #b8a88a; text-transform: uppercase; letter-spacing: 1px; }
        .ce-edit-panel input[type=text], .ce-edit-panel textarea { width: 100%; box-sizing: border-box; background: #0e0c09; color: #f0e7d2; border: 1px solid rgba(194,165,122,.35); border-radius: 4px; padding: 8px; font-size: 13px; }
        .ce-edit-note { margin: 0; font-size: 12px; line-height: 1.6; color: #b8a88a; }
        .ce-edit-tag { font-size: 11px; color: #8a7a62; word-break: break-all; }
        .ce-edit-actions { display: flex; gap: 8px; }
        .ce-edit-actions button { flex: 1; padding: 9px; border: 1px solid rgba(194,165,122,.5); background: transparent; color: #f0e7d2; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .ce-edit-apply { background: #c2a57a !important; color: #1c1810 !important; border-color: #c2a57a !important; font-weight: 700; }
      `}</style>
    </div>
  );
}

function rotuloMini(sel) {
  if (sel.kind === "avulso" && sel.cls) return <span className="ce-edit-tag">&lt;{sel.tag} class=“{sel.cls}…”&gt;</span>;
  return null;
}

export function makeFrozenConfig(cssHref, bodyClass) {
  return {
    cssHref,
    root: {
      fields: {},
      defaultProps: {},
      // Mesma ordem de CSS da produção: estilos da página, site.css
      // (com escopo), ícones, navbar e hero.
      render: ({ children }) => (
        <>
          <link rel="stylesheet" href={cssHref} />
          <ScopedSiteCss />
          <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
          <link id="casa-estampa-navbar" rel="stylesheet" href="/puck/navbar.css" />
          <link id="casa-estampa-hero" rel="stylesheet" href="/puck/hero.css" />
          <link rel="stylesheet" href={googleFontsStylesheet(PUCK_FONTS)} />
          <div className={`ce-frozen-scope ${bodyClass || ""}`}>{children}</div>
        </>
      ),
    },
    components: {
      Secao: {
        label: "Seção (conteúdo original)",
        fields: {
          rotulo: { type: "text", label: "Rótulo (só no editor)" },
          html: { type: "textarea", label: "HTML da seção (avançado)" },
        },
        defaultProps: { rotulo: "", html: "" },
        render: (props) => (props.puck?.isEditing || props.editMode ? <SecaoEditavel {...props} /> : <Secao {...props} />),
      },
    },
  };
}
