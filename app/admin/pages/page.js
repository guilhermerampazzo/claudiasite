"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconDeviceFloppy,
  IconExternalLink,
  IconLayoutBottombar,
  IconLayoutNavbar,
  IconLogout,
  IconMenu2,
  IconPalette,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconX
} from "@tabler/icons-react";
import { GOOGLE_FONTS } from "@/lib/editor-options";

const globalPartMeta = {
  global_header: { label: "Header", description: "Logo, botao e estrutura superior", icon: IconLayoutNavbar },
  global_menu: { label: "Menu", description: "Links de navegacao de todas as paginas", icon: IconMenu2 },
  global_footer: { label: "Footer", description: "Rodape compartilhado do site", icon: IconLayoutBottombar }
};

export default function PagesDashboard() {
  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState({ primaryColor: "#c2a57a", accentColor: "#c8960c", fontFamily: "Montserrat", css: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "", templateSlug: "amorim" });

  useEffect(() => { load(); }, []);

  const contentPages = useMemo(() => pages.filter((page) => page.page_type === "page"), [pages]);
  const globalParts = useMemo(() => pages.filter((page) => page.page_type?.startsWith("global_")), [pages]);

  async function load() {
    const [pagesResponse, settingsResponse] = await Promise.all([fetch("/api/pages"), fetch("/api/settings")]);
    if (pagesResponse.status === 401) { window.location.href = "/admin"; return; }
    setPages((await pagesResponse.json()).pages);
    setSettings((await settingsResponse.json()).settings);
  }

  async function saveSettings(event) {
    event.preventDefault();
    setStatus("");
    setError("");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    if (!response.ok) { setError("Nao foi possivel salvar as configuracoes."); return; }
    setStatus("Configuracoes globais salvas.");
  }

  async function createNewPage(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    const response = await fetch("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(newPage) });
    const data = await response.json();
    setCreating(false);
    if (!response.ok) { setError(data.error || "Nao foi possivel criar a pagina."); return; }
    window.location.href = `/admin/editor/${data.page.slug}`;
  }

  function updateTitle(title) {
    setNewPage((current) => ({ ...current, title, slug: slugify(title) }));
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin/pages"><img src="/assets/logo-icone.svg" alt="" /><img src="/assets/logo-letra.svg" alt="Casa Estampa" /></a>
        <div className="admin-topbar-actions"><a className="btn" href="/" target="_blank"><IconExternalLink size={18} />Ver site</a><button className="btn btn-icon" onClick={logout} title="Sair"><IconLogout size={18} /></button></div>
      </header>

      <main className="admin-main">
        <div className="dashboard-heading">
          <div><p className="kicker">Casa Estampa CMS</p><h1 className="admin-title">Paginas e areas globais</h1><p className="admin-subtitle">Edite paginas individuais ou componentes compartilhados em todo o site.</p></div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><IconPlus size={18} />Nova pagina</button>
        </div>

        <section className="global-parts-section">
          <div className="section-heading"><div><p className="kicker">Estrutura compartilhada</p><h2>Header, menu e footer</h2></div><span>Alteracoes refletem automaticamente nas paginas que usam essas areas.</span></div>
          <div className="global-parts-grid">
            {globalParts.map((part) => {
              const meta = globalPartMeta[part.page_type];
              if (!meta) return null;
              const Icon = meta.icon;
              return <article className="global-part-row" key={part.slug}><Icon size={25} /><div><strong>{meta.label}</strong><span>{meta.description}</span></div><a className="btn btn-primary" href={`/admin/editor/${part.slug}`}><IconPencil size={16} />Editar</a></article>;
            })}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="page-list-section">
            <div className="section-heading"><div><p className="kicker">Conteudo</p><h2>Paginas do site</h2></div><span>{contentPages.length} paginas</span></div>
            <div className="page-list">{contentPages.map((page) => <article className="page-row" key={page.slug}><div><strong>{page.title}</strong><small>/{page.is_home ? "" : page.slug}</small></div><a className="btn" href={page.is_home ? "/" : `/${page.slug}`} target="_blank"><IconExternalLink size={17} />Abrir</a><a className="btn btn-primary" href={`/admin/editor/${page.slug}`}><IconPencil size={17} />Editar</a></article>)}</div>
          </section>

          <aside className="settings-panel">
            <form className="form-grid" onSubmit={saveSettings}>
              <div><p className="kicker"><IconPalette size={14} />Estilo global</p><p className="admin-subtitle">Cores e fonte aplicadas a todas as paginas.</p></div>
              <div className="global-color-fields"><label className="field"><span>Cor principal</span><input type="color" value={settings.primaryColor || "#c2a57a"} onChange={(event) => setSettings({ ...settings, primaryColor: event.target.value })} /></label><label className="field"><span>Cor de destaque</span><input type="color" value={settings.accentColor || "#c8960c"} onChange={(event) => setSettings({ ...settings, accentColor: event.target.value })} /></label></div>
              <label className="field"><span>Fonte global</span><select value={settings.fontFamily || "Montserrat"} style={{ fontFamily: settings.fontFamily }} onChange={(event) => setSettings({ ...settings, fontFamily: event.target.value })}>{GOOGLE_FONTS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
              <div className="font-preview" style={{ fontFamily: settings.fontFamily }}><strong>Casa Estampa</strong><span>Interiores com personalidade.</span></div>
              <label className="field"><span>CSS extra</span><textarea value={settings.css || ""} onChange={(event) => setSettings({ ...settings, css: event.target.value })} placeholder=".hero-title { letter-spacing: 1px; }" /></label>
              <button className="btn btn-primary"><IconDeviceFloppy size={18} />Salvar global</button><button type="button" className="btn" onClick={load}><IconRefresh size={18} />Atualizar</button>
              {status ? <div className="success-box">{status}</div> : null}
            </form>
          </aside>
        </div>
        {error ? <div className="dashboard-error error-box">{error}</div> : null}
      </main>

      {showCreate ? <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="new-page-title"><div className="admin-modal-head"><div><p className="kicker">Novo conteudo</p><h2 id="new-page-title">Criar pagina</h2></div><button className="btn btn-icon" onClick={() => setShowCreate(false)} title="Fechar"><IconX size={19} /></button></div><form className="form-grid" onSubmit={createNewPage}><label className="field"><span>Titulo da pagina</span><input value={newPage.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Ex.: Tapetes" autoFocus /></label><label className="field"><span>Endereco</span><div className="slug-input"><span>/</span><input value={newPage.slug} onChange={(event) => setNewPage({ ...newPage, slug: slugify(event.target.value) })} placeholder="tapetes" /></div></label><label className="field"><span>Usar como modelo</span><select value={newPage.templateSlug} onChange={(event) => setNewPage({ ...newPage, templateSlug: event.target.value })}>{contentPages.map((page) => <option key={page.slug} value={page.slug}>{page.title}</option>)}</select></label><p className="panel-help">A nova pagina copia a estrutura do modelo e abre diretamente no editor visual.</p><div className="modal-actions"><button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button><button className="btn btn-primary" disabled={creating || !newPage.title || !newPage.slug}><IconPlus size={18} />{creating ? "Criando..." : "Criar e editar"}</button></div></form></section></div> : null}
    </div>
  );
}

function slugify(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
