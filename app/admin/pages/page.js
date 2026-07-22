"use client";

import { useEffect, useState } from "react";
import {
  IconExternalLink,
  IconLogout,
  IconPalette,
  IconPencil,
  IconRefresh,
  IconDeviceFloppy
} from "@tabler/icons-react";

export default function PagesDashboard() {
  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState({
    primaryColor: "#c2a57a",
    accentColor: "#c8960c",
    fontFamily: "Montserrat",
    css: ""
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [pagesResponse, settingsResponse] = await Promise.all([
      fetch("/api/pages"),
      fetch("/api/settings")
    ]);
    if (pagesResponse.status === 401) {
      window.location.href = "/admin";
      return;
    }
    setPages((await pagesResponse.json()).pages);
    setSettings((await settingsResponse.json()).settings);
  }

  async function saveSettings(event) {
    event.preventDefault();
    setStatus("");
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings)
    });
    setStatus("Configuracoes globais salvas.");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin/pages">
          <img src="/assets/logo-icone.svg" alt="" />
          <img src="/assets/logo-letra.svg" alt="Casa Estampa" />
        </a>
        <div className="admin-topbar-actions">
          <a className="btn" href="/" target="_blank">
            <IconExternalLink size={18} />
            Ver site
          </a>
          <button className="btn btn-icon" onClick={logout} title="Sair">
            <IconLogout size={18} />
          </button>
        </div>
      </header>

      <main className="admin-main">
        <p className="kicker">Casa Estampa CMS</p>
        <h1 className="admin-title">Paginas editaveis</h1>
        <p className="admin-subtitle">
          Cada pagina abaixo foi importada do HTML original e pode ser editada no modo visual.
        </p>

        <div className="dashboard-grid">
          <section className="page-list">
            {pages.map((page) => (
              <article className="page-row" key={page.slug}>
                <div>
                  <strong>{page.title}</strong>
                  <small>/{page.is_home ? "" : page.slug}</small>
                </div>
                <a className="btn" href={page.is_home ? "/" : `/${page.slug}`} target="_blank">
                  <IconExternalLink size={17} />
                  Abrir
                </a>
                <a className="btn btn-primary" href={`/admin/editor/${page.slug}`}>
                  <IconPencil size={17} />
                  Editar
                </a>
              </article>
            ))}
          </section>

          <aside className="settings-panel">
            <form className="form-grid" onSubmit={saveSettings}>
              <div>
                <p className="kicker">
                  <IconPalette size={14} /> Estilo global
                </p>
                <p className="admin-subtitle">
                  Ajustes globais entram por cima do HTML sem apagar a estrutura original.
                </p>
              </div>
              <label className="field">
                <span>Cor principal</span>
                <input
                  type="color"
                  value={settings.primaryColor || "#c2a57a"}
                  onChange={(event) =>
                    setSettings({ ...settings, primaryColor: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Cor de destaque</span>
                <input
                  type="color"
                  value={settings.accentColor || "#c8960c"}
                  onChange={(event) =>
                    setSettings({ ...settings, accentColor: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Fonte global</span>
                <select
                  value={settings.fontFamily || "Montserrat"}
                  onChange={(event) =>
                    setSettings({ ...settings, fontFamily: event.target.value })
                  }
                >
                  <option>Montserrat</option>
                  <option>Playfair Display</option>
                  <option>Italiana</option>
                  <option>Arial</option>
                </select>
              </label>
              <label className="field">
                <span>CSS extra</span>
                <textarea
                  value={settings.css || ""}
                  onChange={(event) => setSettings({ ...settings, css: event.target.value })}
                  placeholder=".hero-title { letter-spacing: 1px; }"
                />
              </label>
              <button className="btn btn-primary">
                <IconDeviceFloppy size={18} />
                Salvar global
              </button>
              <button type="button" className="btn" onClick={load}>
                <IconRefresh size={18} />
                Atualizar
              </button>
              {status ? <div className="success-box">{status}</div> : null}
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
