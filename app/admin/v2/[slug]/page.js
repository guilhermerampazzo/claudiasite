"use client";

/*
 * Admin v2 — editor por página (Puck).
 * Rota: /admin/v2/[slug]. Edita + pré-visualiza. NÃO publica
 * (o site público continua vindo do banco/editor antigo).
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Puck, Render } from "@measured/puck";
import "@measured/puck/puck.css";
import { getPuckPage, PUCK_PAGES } from "@/lib/puck/registry";

export default function AdminV2Slug() {
  const { slug } = useParams();
  const page = getPuckPage(slug);
  const [data, setData] = useState(page?.initial);
  const [view, setView] = useState("editor");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    async function load() {
      let base = page.initial;
      if (!base && page.dataUrl) {
        try {
          const res = await fetch(page.dataUrl, { cache: "no-store" });
          if (res.ok) base = await res.json();
        } catch {}
      }
      let stored = null;
      try {
        const raw = window.localStorage.getItem(page.storageKey);
        if (raw) stored = JSON.parse(raw);
      } catch {}
      if (!cancelled) {
        setData(stored || base);
        setReady(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!page) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Página v2 não encontrada: {slug}</h1>
        <ul>
          {Object.values(PUCK_PAGES).map((p) => (
            <li key={p.slug}>
              <a href={`/admin/v2/${p.slug}`}>{p.titulo}</a>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  function handleChange(next) {
    setData(next);
    try {
      window.localStorage.setItem(page.storageKey, JSON.stringify(next));
      setStatus("Rascunho salvo no navegador.");
    } catch {}
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug}-puck.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restoreOriginal() {
    if (!confirm("Descartar o rascunho e voltar ao conteúdo original?")) return;
    let base = page.initial;
    if (!base && page.dataUrl) {
      try {
        const res = await fetch(page.dataUrl, { cache: "no-store" });
        if (res.ok) base = await res.json();
      } catch {}
    }
    setData(base);
    try {
      window.localStorage.removeItem(page.storageKey);
    } catch {}
    setStatus("Original restaurado.");
  }

  if (!ready) return <main style={{ padding: 40 }}>Carregando editor…</main>;

  return (
    <main>
      <link rel="stylesheet" href={page.config.cssHref || "/puck/global.css"} />
      <div className="v2-toolbar">
        <div>
          <strong>
            {page.titulo} — novo editor (v2)
          </strong>
          <span className="v2-hint">
            {status ||
              (page.frozen
                ? "Página preservada 1:1 do site. Selecione uma seção para ver/editar o conteúdo (avançado)."
                : "Edite à esquerda: textos/imagens/links. Estrutura travada: não quebra celular nem PC.")}
          </span>
        </div>
        <div className="v2-actions">
          <button className={view === "editor" ? "active" : ""} onClick={() => setView("editor")}>
            Editar
          </button>
          <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
            Pré-visualizar
          </button>
          <button onClick={exportJson} title="Baixar o JSON da página">
            Exportar JSON
          </button>
          <button onClick={restoreOriginal} title="Voltar ao original">
            Restaurar
          </button>
          <a href={page.previewHref} target="_blank" title="Abrir preview público">
            Preview ↗
          </a>
          <a href={page.liveHref} target="_blank" title="Abrir o ar para comparar">
            Site no ar ↗
          </a>
        </div>
      </div>

      {view === "editor" ? (
        <Puck
          config={page.config}
          data={data}
          onChange={handleChange}
          onPublish={exportJson}
          headerTitle={`${page.titulo} — Casa Estampa`}
          headerPath="/admin/v2"
          viewports={[
            { width: 1280, height: "auto", label: "Computador", icon: "Monitor" },
            { width: 390, height: "auto", label: "Celular", icon: "Smartphone" },
          ]}
        />
      ) : (
        <div className="v2-preview-note">
          Pré-visualização desktop. Para o celular, use o modo responsivo do navegador (F12 → 390px) ou o{" "}
          <a href={page.previewHref} target="_blank">
            preview público
          </a>
          .
          <div className="v2-preview">
            <Render config={page.config} data={data} />
          </div>
        </div>
      )}

      <style>{`
        .v2-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; background: #141210; color: #e8dcc0; border-bottom: 1px solid rgba(194,165,122,.25); position: sticky; top: 0; z-index: 50; }
        .v2-toolbar strong { display: block; font-size: 14px; }
        .v2-hint { font-size: 12px; color: #b7a98c; }
        .v2-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .v2-actions button, .v2-actions a { padding: 8px 14px; border: 1px solid rgba(194,165,122,.4); background: transparent; color: #e8dcc0; cursor: pointer; text-decoration: none; font-size: 12px; }
        .v2-actions button.active { background: #c2a57a; color: #181510; border-color: #c2a57a; }
        .v2-preview-note { padding: 16px 20px; background: #0e0c09; color: #b7a98c; font-size: 13px; }
        .v2-preview { margin-top: 12px; }
        .v2-preview-note a { color: #c2a57a; }
      `}</style>
    </main>
  );
}
