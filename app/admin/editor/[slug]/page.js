"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  IconArrowBackUp,
  IconBox,
  IconCarouselHorizontal,
  IconChevronDown,
  IconCode,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconHeading,
  IconLayoutColumns,
  IconLayoutNavbar,
  IconLink,
  IconPhoto,
  IconPlayerPlay,
  IconRefresh,
  IconTrash,
  IconTypography
} from "@tabler/icons-react";

const widgetGroups = [
  {
    label: "Estrutura",
    items: [
      { type: "section", label: "Secao", icon: IconLayoutNavbar },
      { type: "container", label: "Container", icon: IconBox },
      { type: "columns", label: "2 colunas", icon: IconLayoutColumns }
    ]
  },
  {
    label: "Basicos",
    items: [
      { type: "title", label: "Titulo", icon: IconHeading },
      { type: "text", label: "Texto", icon: IconTypography },
      { type: "button", label: "Botao", icon: IconLink },
      { type: "image", label: "Imagem", icon: IconPhoto },
      { type: "carousel", label: "Carrossel", icon: IconCarouselHorizontal }
    ]
  }
];

export default function EditorPage() {
  const { slug } = useParams();
  const iframeRef = useRef(null);
  const saveResolver = useRef(null);
  const [page, setPage] = useState(null);
  const [html, setHtml] = useState("");
  const [selected, setSelected] = useState(null);
  const [tree, setTree] = useState([]);
  const [panel, setPanel] = useState("elements");
  const [settingsTab, setSettingsTab] = useState("content");
  const [mode, setMode] = useState("visual");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, [slug]);

  useEffect(() => {
    function onMessage(event) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "ce-selected") {
        setSelected(event.data.element);
        setSettingsTab("content");
      }
      if (event.data.type === "ce-tree") setTree(event.data.tree || []);
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
    if (response.status === 401) {
      window.location.href = "/admin";
      return;
    }
    if (!response.ok) {
      setError("Nao foi possivel abrir esta pagina.");
      return;
    }
    const data = await response.json();
    setPage(data.page);
    setHtml(data.page.html);
    setSelected(null);
    setStatus("");
  }

  const iframeHtml = useMemo(() => withEditorBridge(html), [html]);

  function post(type, payload = {}) {
    iframeRef.current?.contentWindow?.postMessage({ type, ...payload }, "*");
  }

  function requestHtmlFromFrame() {
    return new Promise((resolve) => {
      saveResolver.current = resolve;
      post("ce-request-html");
      setTimeout(() => {
        if (saveResolver.current) {
          saveResolver.current = null;
          resolve(html);
        }
      }, 1200);
    });
  }

  async function save() {
    setStatus("Salvando...");
    setError("");
    const nextHtml = mode === "visual" ? await requestHtmlFromFrame() : html;
    const response = await fetch(`/api/pages/${slug}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html: nextHtml, title: page?.title })
    });
    if (!response.ok) {
      setStatus("");
      setError("Nao foi possivel salvar.");
      return;
    }
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
    setStatus("Original restaurado.");
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) {
      setError("Upload nao concluido.");
      return;
    }
    const data = await response.json();
    post("ce-attr", { name: "src", value: data.path });
  }

  function startDrag(event, type) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/casa-estampa-widget", type);
    window.__CE_DRAG_WIDGET = type;
  }

  return (
    <div className="admin-shell editor-shell">
      <div className="editor-layout">
        <aside className="editor-panel">
          <div className="editor-panel-head">
            <a className="admin-brand" href="/admin/pages">
              <img src="/assets/logo-icone.svg" alt="" />
              <img src="/assets/logo-letra.svg" alt="Casa Estampa" />
            </a>
          </div>

          <div className="panel-tabs" role="tablist" aria-label="Painel do editor">
            <button className={panel === "elements" ? "active" : ""} onClick={() => setPanel("elements")}>Elementos</button>
            <button className={panel === "navigator" ? "active" : ""} onClick={() => setPanel("navigator")}>Navegador</button>
          </div>

          <div className="editor-panel-scroll">
            {panel === "elements" ? (
              <>
                <p className="panel-help">Arraste um elemento. A linha azul mostra exatamente onde ele sera inserido.</p>
                {widgetGroups.map((group) => (
                  <div className="tool-group" key={group.label}>
                    <div className="tool-title">{group.label}</div>
                    <div className="widget-grid">
                      {group.items.map((widget) => {
                        const Icon = widget.icon;
                        return (
                          <button
                            className="widget"
                            key={widget.type}
                            draggable
                            onDragStart={(event) => startDrag(event, widget.type)}
                            onDragEnd={() => { window.__CE_DRAG_WIDGET = null; }}
                            onClick={() => post("ce-add-widget", { widget: widget.type })}
                            title={`Adicionar ${widget.label}`}
                          >
                            <Icon size={22} />
                            <span>{widget.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="navigator-wrap">
                <div className="tool-title">Estrutura da pagina</div>
                {tree.length ? <TreeNodes nodes={tree} selectedId={selected?.id} onSelect={(id) => post("ce-select-id", { id })} /> : <p className="panel-help">A estrutura aparecera quando a pagina carregar.</p>}
              </div>
            )}

            <div className="tool-group element-settings">
              <div className="tool-title">{selected ? selected.label : "Elemento selecionado"}</div>
              {selected ? (
                <>
                  <div className="settings-tabs">
                    <button className={settingsTab === "content" ? "active" : ""} onClick={() => setSettingsTab("content")}>Conteudo</button>
                    <button className={settingsTab === "style" ? "active" : ""} onClick={() => setSettingsTab("style")}>Estilo</button>
                    <button className={settingsTab === "advanced" ? "active" : ""} onClick={() => setSettingsTab("advanced")}>Avancado</button>
                  </div>

                  {settingsTab === "content" ? (
                    <>
                      {!selected.isContainer ? <label className="field"><span>Texto / conteudo</span><textarea value={selected.html || ""} onChange={(event) => { setSelected({ ...selected, html: event.target.value }); post("ce-html-content", { value: event.target.value }); }} /></label> : <p className="panel-help">Solte widgets dentro deste container ou use o Navegador para selecionar seus itens.</p>}
                      {(selected.tag === "a" || selected.href) ? <label className="field"><span>Link</span><input value={selected.href || ""} onChange={(event) => { setSelected({ ...selected, href: event.target.value }); post("ce-attr", { name: "href", value: event.target.value }); }} /></label> : null}
                      {(selected.tag === "img" || selected.src) ? <><label className="field"><span>Endereco da imagem</span><input value={selected.src || ""} onChange={(event) => { setSelected({ ...selected, src: event.target.value }); post("ce-attr", { name: "src", value: event.target.value }); }} /></label><label className="upload-field"><IconPhoto size={18} /> Trocar imagem<input type="file" accept="image/*,video/*" onChange={uploadImage} /></label></> : null}
                    </>
                  ) : null}

                  {settingsTab === "style" ? (
                    <>
                      <div className="color-row">
                        <label className="field"><span>Cor do texto</span><input type="color" value={selected.color || "#222222"} onChange={(event) => post("ce-style", { name: "color", value: event.target.value })} /></label>
                        <label className="field"><span>Cor do fundo</span><input type="color" value={selected.backgroundColor || "#ffffff"} onChange={(event) => post("ce-style", { name: "backgroundColor", value: event.target.value })} /></label>
                      </div>
                      <button className="text-action" onClick={() => post("ce-style", { name: "backgroundColor", value: "transparent" })}>Remover cor de fundo</button>
                      <label className="field"><span>Tamanho da fonte</span><input placeholder="Ex.: 42px" value={selected.fontSize || ""} onChange={(event) => post("ce-style", { name: "fontSize", value: event.target.value })} /></label>
                      <label className="field"><span>Alinhamento</span><select value={selected.textAlign || ""} onChange={(event) => post("ce-style", { name: "textAlign", value: event.target.value })}><option value="">Herdar</option><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label>
                    </>
                  ) : null}

                  {settingsTab === "advanced" ? (
                    <>
                      <label className="field"><span>Espacamento interno</span><input placeholder="Ex.: 40px 24px" value={selected.padding || ""} onChange={(event) => post("ce-style", { name: "padding", value: event.target.value })} /></label>
                      <label className="field"><span>Espacamento externo</span><input placeholder="Ex.: 0 auto 24px" value={selected.margin || ""} onChange={(event) => post("ce-style", { name: "margin", value: event.target.value })} /></label>
                      <label className="field"><span>Largura maxima</span><input placeholder="Ex.: 1200px" value={selected.maxWidth || ""} onChange={(event) => post("ce-style", { name: "maxWidth", value: event.target.value })} /></label>
                    </>
                  ) : null}

                  <div className="element-actions">
                    <button className="btn" onClick={() => post("ce-duplicate")} title="Duplicar"><IconCopy size={17} /> Duplicar</button>
                    <button className="btn btn-danger" onClick={() => post("ce-delete")} title="Apagar"><IconTrash size={17} /> Apagar</button>
                  </div>
                </>
              ) : <p className="panel-help">Clique em um elemento da pagina para abrir suas opcoes.</p>}
            </div>
          </div>
        </aside>

        <main className="editor-stage">
          <div className="editor-toolbar">
            <div className="editor-page-name"><h1>{page?.title || "Editor"}</h1><span>/{slug === "amorim" ? "" : slug}</span></div>
            <div className="editor-toolbar-actions">
              <div className="view-toggle">
                <button className={mode === "visual" ? "active" : ""} onClick={() => setMode("visual")} title="Editor visual"><IconPlayerPlay size={17} /> Visual</button>
                <button className={mode === "html" ? "active" : ""} onClick={() => setMode("html")} title="Codigo HTML"><IconCode size={17} /> HTML</button>
              </div>
              <button className="btn btn-icon" onClick={loadPage} title="Recarregar"><IconRefresh size={18} /></button>
              <button className="btn btn-icon" onClick={resetOriginal} title="Restaurar original"><IconArrowBackUp size={18} /></button>
              <a className="btn btn-icon" href={`/${slug === "amorim" ? "" : slug}`} target="_blank" title="Ver publicada"><IconExternalLink size={18} /></a>
              <button className="btn btn-primary" onClick={save}><IconDeviceFloppy size={18} /> Salvar</button>
            </div>
          </div>
          <div className="editor-notice-row">
            <span>{status || "Selecione um elemento ou arraste um widget para a pagina."}</span>
            {error ? <span className="editor-error">{error}</span> : null}
          </div>
          <div className="editor-frame-wrap">
            {mode === "visual" ? <iframe ref={iframeRef} className="editor-frame" srcDoc={iframeHtml} title="Preview editavel" /> : <textarea className="raw-html" value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function TreeNodes({ nodes, selectedId, onSelect, depth = 0 }) {
  return <div className="tree-list">{nodes.map((node) => <div key={node.id}><button className={`tree-node ${selectedId === node.id ? "active" : ""}`} style={{ "--depth": depth }} onClick={() => onSelect(node.id)}><IconChevronDown size={14} className={node.children?.length ? "" : "tree-spacer"} /><span className={`tree-kind tree-kind-${node.kind}`}>{node.kind.slice(0, 1).toUpperCase()}</span><span>{node.label}</span></button>{node.children?.length ? <TreeNodes nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} /> : null}</div>)}</div>;
}

function withEditorBridge(html) {
  const bridge = `
<style id="ce-editor-style">
  [data-ce-selected="true"] { outline: 2px solid #1689e8 !important; outline-offset: 2px !important; }
  [data-ce-hover="true"] { outline: 1px dashed #1689e8 !important; outline-offset: 1px !important; }
  [data-ce-kind="section"], [data-ce-kind="container"] { min-height: 56px; }
  [data-ce-kind="section"] { position: relative; }
  [data-ce-kind="section"]::before { content: "SECAO"; position: absolute; top: 3px; left: 3px; z-index: 2147483644; padding: 3px 7px; color: white; background: #1689e8; font: 600 10px/1 Arial,sans-serif; letter-spacing: 0; opacity: 0; pointer-events: none; }
  [data-ce-kind="section"]:hover::before, [data-ce-kind="section"][data-ce-selected="true"]::before { opacity: 1; }
  [data-ce-drop-inside="true"] { outline: 3px solid #1689e8 !important; outline-offset: -4px !important; background-image: linear-gradient(rgba(22,137,232,.08),rgba(22,137,232,.08)) !important; }
  #ce-drop-line { position: absolute; z-index: 2147483647; height: 4px; border-radius: 3px; background: #1689e8; pointer-events: none; box-shadow: 0 0 0 2px white; display: none; }
  #ce-drop-line::before { content: "+"; position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; border-radius: 50%; color: white; background: #1689e8; transform: translate(-50%,-50%); font: 700 18px/22px Arial,sans-serif; text-align: center; box-shadow: 0 0 0 2px white; }
</style>
<script id="ce-editor-bridge">
(() => {
  const ignored = new Set(["HTML", "HEAD", "BODY", "SCRIPT", "STYLE", "META", "LINK", "TITLE", "BR"]);
  const structural = new Set(["MAIN", "HEADER", "FOOTER", "NAV", "SECTION", "ARTICLE"]);
  let selected = null;
  let counter = 1;
  let dropState = null;
  const dropLine = document.createElement("div");
  dropLine.id = "ce-drop-line";
  document.body.appendChild(dropLine);

  function assignIds() {
    document.querySelectorAll("body *").forEach((element) => {
      if (!ignored.has(element.tagName) && element.id !== "ce-drop-line" && !element.dataset.ceId) element.dataset.ceId = String(counter++);
    });
  }

  function kindOf(element) {
    if (element.dataset.ceKind) return element.dataset.ceKind;
    if (structural.has(element.tagName)) return element.tagName === "SECTION" ? "section" : "structure";
    if (element.dataset.ceWidget) return "widget";
    if (["DIV", "UL", "OL"].includes(element.tagName) && element.children.length) return "container";
    return "widget";
  }

  function labelOf(element) {
    if (element.dataset.ceLabel) return element.dataset.ceLabel;
    if (element.dataset.ceWidget) return element.dataset.ceWidget.charAt(0).toUpperCase() + element.dataset.ceWidget.slice(1);
    const names = { MAIN: "Conteudo principal", HEADER: "Cabecalho", FOOTER: "Rodape", NAV: "Navegacao", SECTION: "Secao", DIV: "Container", H1: "Titulo H1", H2: "Titulo H2", H3: "Titulo H3", P: "Texto", A: "Link / Botao", IMG: "Imagem", UL: "Lista", OL: "Lista" };
    return names[element.tagName] || element.tagName.toLowerCase();
  }

  function info(element) {
    const style = window.getComputedStyle(element);
    const background = rgbToHex(style.backgroundColor, "");
    return { id: element.dataset.ceId, tag: element.tagName.toLowerCase(), kind: kindOf(element), label: labelOf(element), isContainer: canContain(element), className: typeof element.className === "string" ? element.className : "", html: element.innerHTML || "", href: element.getAttribute("href") || "", src: element.getAttribute("src") || "", color: rgbToHex(style.color, "#222222"), backgroundColor: background, fontSize: style.fontSize || "", textAlign: style.textAlign || "", padding: element.style.padding || "", margin: element.style.margin || "", maxWidth: element.style.maxWidth || "" };
  }

  function select(element) {
    if (!element || ignored.has(element.tagName) || element.id === "ce-drop-line") return;
    if (selected) selected.removeAttribute("data-ce-selected");
    selected = element;
    selected.dataset.ceSelected = "true";
    window.parent.postMessage({ type: "ce-selected", element: info(selected) }, "*");
  }

  function canContain(element) {
    return ["BODY", "MAIN", "HEADER", "FOOTER", "NAV", "SECTION", "ARTICLE", "DIV", "LI"].includes(element.tagName);
  }

  function treeNode(element, depth) {
    const children = depth < 5 ? Array.from(element.children).filter((child) => !ignored.has(child.tagName) && child.id !== "ce-drop-line").map((child) => treeNode(child, depth + 1)).filter(Boolean) : [];
    const meaningful = structural.has(element.tagName) || element.dataset.ceKind || element.dataset.ceWidget || ["H1", "H2", "H3", "P", "A", "IMG", "DIV", "UL", "OL"].includes(element.tagName);
    if (!meaningful && !children.length) return null;
    return { id: element.dataset.ceId, label: labelOf(element), kind: kindOf(element), children };
  }

  function sendTree() {
    const roots = Array.from(document.body.children).filter((element) => element.id !== "ce-drop-line" && !ignored.has(element.tagName)).map((element) => treeNode(element, 0)).filter(Boolean);
    window.parent.postMessage({ type: "ce-tree", tree: roots }, "*");
  }

  function changed() {
    assignIds();
    sendTree();
    window.parent.postMessage({ type: "ce-changed" }, "*");
  }

  function currentTarget() {
    if (selected && canContain(selected)) return selected;
    return selected?.parentElement || document.querySelector("main") || document.body;
  }

  function insertWidget(type, state) {
    const holder = document.createElement("div");
    holder.innerHTML = widgetHtml(type);
    const node = holder.firstElementChild;
    if (!node) return;
    const target = state?.target || currentTarget();
    const position = state?.position || (canContain(target) ? "inside" : "after");
    if (position === "inside" && canContain(target)) target.appendChild(node);
    else if (position === "before") target.before(node);
    else target.after(node);
    clearDrop();
    changed();
    select(node);
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function widgetHtml(type) {
    if (type === "section") return '<section data-ce-kind="section" data-ce-label="Nova secao" style="padding:48px 24px;min-height:120px;"><div data-ce-kind="container" style="width:min(1200px,100%);margin:0 auto;min-height:72px;"><h2 data-ce-widget="title">Novo titulo</h2><p data-ce-widget="text">Escreva aqui o conteudo da nova secao.</p></div></section>';
    if (type === "container") return '<div data-ce-kind="container" data-ce-label="Novo container" style="display:flex;flex-direction:column;gap:20px;padding:24px;min-height:80px;"></div>';
    if (type === "columns") return '<div data-ce-kind="container" data-ce-label="Duas colunas" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:24px;min-height:100px;"><div data-ce-kind="container" style="min-height:72px;"></div><div data-ce-kind="container" style="min-height:72px;"></div></div>';
    if (type === "title") return '<h2 data-ce-widget="title" style="margin:0 0 16px;">Novo titulo</h2>';
    if (type === "text") return '<p data-ce-widget="text" style="margin:0 0 16px;line-height:1.7;">Escreva aqui o novo texto da pagina.</p>';
    if (type === "button") return '<a data-ce-widget="button" href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:1px solid currentColor;background:transparent;color:inherit;text-decoration:none;">Texto do botao</a>';
    if (type === "image") return '<img data-ce-widget="image" src="/assets/logo-letra.svg" alt="" style="display:block;max-width:100%;height:auto;" />';
    if (type === "carousel") return '<div data-ce-widget="carousel" data-ce-label="Carrossel" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;width:100%;"><img src="/assets/logo-letra.svg" alt="" style="display:block;width:100%;aspect-ratio:4/3;object-fit:contain;" /><img src="/assets/logo-letra.svg" alt="" style="display:block;width:100%;aspect-ratio:4/3;object-fit:contain;" /><img src="/assets/logo-letra.svg" alt="" style="display:block;width:100%;aspect-ratio:4/3;object-fit:contain;" /></div>';
    return '<div data-ce-kind="container" style="min-height:80px;"></div>';
  }

  function resolveDrop(event) {
    const target = event.target.closest("[data-ce-id]") || document.body;
    if (target.id === "ce-drop-line") return dropState;
    const rect = target.getBoundingClientRect();
    const edge = Math.min(32, Math.max(12, rect.height * 0.25));
    let position = "inside";
    if (!canContain(target) || event.clientY < rect.top + edge) position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    else if (event.clientY > rect.bottom - edge) position = "after";
    return { target, position };
  }

  function showDrop(state) {
    if (dropState?.target) dropState.target.removeAttribute("data-ce-drop-inside");
    dropState = state;
    if (!state) return clearDrop();
    if (state.position === "inside") {
      state.target.dataset.ceDropInside = "true";
      dropLine.style.display = "none";
      return;
    }
    const rect = state.target.getBoundingClientRect();
    dropLine.style.display = "block";
    dropLine.style.left = (rect.left + window.scrollX) + "px";
    dropLine.style.top = ((state.position === "before" ? rect.top : rect.bottom) + window.scrollY - 2) + "px";
    dropLine.style.width = rect.width + "px";
  }

  function clearDrop() {
    if (dropState?.target) dropState.target.removeAttribute("data-ce-drop-inside");
    dropState = null;
    dropLine.style.display = "none";
  }

  function serialize() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[data-ce-id], [data-ce-selected], [data-ce-hover], [data-ce-drop-inside]").forEach((node) => { node.removeAttribute("data-ce-id"); node.removeAttribute("data-ce-selected"); node.removeAttribute("data-ce-hover"); node.removeAttribute("data-ce-drop-inside"); });
    clone.querySelector("#ce-editor-style")?.remove();
    clone.querySelector("#ce-editor-bridge")?.remove();
    clone.querySelector("#ce-drop-line")?.remove();
    return "<!DOCTYPE html>\\n" + clone.outerHTML;
  }

  function rgbToHex(value, fallback) {
    const match = String(value).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/);
    if (!match || Number(match[4]) === 0) return fallback;
    return "#" + [match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("");
  }

  assignIds();
  sendTree();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-ce-id]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    select(target);
  }, true);

  document.addEventListener("mouseover", (event) => { const target = event.target.closest("[data-ce-id]"); if (target && target !== selected) target.dataset.ceHover = "true"; }, true);
  document.addEventListener("mouseout", (event) => { const target = event.target.closest("[data-ce-id]"); if (target) target.removeAttribute("data-ce-hover"); }, true);
  document.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; showDrop(resolveDrop(event)); });
  document.addEventListener("dragleave", (event) => { if (!event.relatedTarget) clearDrop(); });
  document.addEventListener("drop", (event) => { event.preventDefault(); const type = event.dataTransfer.getData("text/casa-estampa-widget") || window.parent.__CE_DRAG_WIDGET || "container"; insertWidget(type, dropState || resolveDrop(event)); window.parent.__CE_DRAG_WIDGET = null; });

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "ce-request-html") window.parent.postMessage({ type: "ce-html", html: serialize() }, "*");
    if (data.type === "ce-add-widget") insertWidget(data.widget, { target: currentTarget(), position: canContain(currentTarget()) ? "inside" : "after" });
    if (data.type === "ce-select-id") select(document.querySelector('[data-ce-id="' + data.id + '"]'));
    if (!selected) return;
    if (data.type === "ce-html-content") { selected.innerHTML = data.value || ""; changed(); }
    if (data.type === "ce-attr") { if (data.value) selected.setAttribute(data.name, data.value); else selected.removeAttribute(data.name); changed(); }
    if (data.type === "ce-style") { selected.style[data.name] = data.value || ""; changed(); select(selected); }
    if (data.type === "ce-delete") { const next = selected.parentElement; selected.remove(); selected = null; changed(); if (next && !ignored.has(next.tagName)) select(next); }
    if (data.type === "ce-duplicate") { const copy = selected.cloneNode(true); copy.removeAttribute("data-ce-selected"); copy.querySelectorAll("[data-ce-id]").forEach((node) => node.removeAttribute("data-ce-id")); copy.removeAttribute("data-ce-id"); selected.after(copy); changed(); select(copy); }
  });
})();
</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${bridge}\n</body>`) : `${html}\n${bridge}`;
}
