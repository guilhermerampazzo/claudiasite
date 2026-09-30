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
import { usePuck } from "@measured/puck";
import { googleFontsStylesheet } from "../editor-options.js";
import { ImagemField } from "./fields.js";

const PUCK_FONTS = ["Cormorant Garamond", "EB Garamond", "Great Vibes", "Italiana", "Montserrat", "Roboto"];

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
    setSel(found);
  }

  return (
    <>
      <div ref={boxRef} onClickCapture={onPick} dangerouslySetInnerHTML={{ __html: html || "" }} />
      {sel ? <PainelEdicao sel={sel} onAplicar={aplicar} onFechar={() => setSel(null)} /> : null}
    </>
  );
}

function PainelEdicao({ sel, onAplicar, onFechar }) {
  const [text, setText] = useState(sel.text ?? "");
  const [href, setHref] = useState(sel.href ?? "");
  const [src, setSrc] = useState(sel.src ?? "");
  const [alt, setAlt] = useState(sel.alt ?? "");

  const titulo =
    sel.kind === "img" ? "Editar imagem" : sel.kind === "text" ? `Editar texto (<${sel.tag}>)` : sel.kind === "link" ? "Editar link/botão" : "Elemento com formatação interna";

  return (
    <div className="ce-edit-panel">
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
        .ce-edit-panel { position: fixed; top: 76px; right: 16px; z-index: 9999; width: 320px; max-height: calc(100vh - 100px); overflow: auto; background: #1c1810; color: #f0e7d2; border: 1px solid rgba(194,165,122,.5); border-radius: 8px; padding: 14px; display: grid; gap: 10px; font-family: Arial, sans-serif; box-shadow: 0 18px 48px rgba(0,0,0,.5); }
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

export function makeFrozenConfig(cssHref) {
  return {
    cssHref,
    root: {
      fields: {},
      defaultProps: {},
      render: ({ children }) => (
        <>
          <link rel="stylesheet" href={cssHref} />
          <link rel="stylesheet" href={googleFontsStylesheet(PUCK_FONTS)} />
          <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
          {children}
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
        render: (props) => (props.editMode ? <SecaoEditavel {...props} /> : <Secao {...props} />),
      },
    },
  };
}
