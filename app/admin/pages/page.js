"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconDeviceFloppy,
  IconExternalLink,
  IconHome,
  IconLayoutBottombar,
  IconLayoutNavbar,
  IconLogout,
  IconMenu2,
  IconPackage,
  IconPalette,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { GOOGLE_FONTS } from "@/lib/editor-options";
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from "@/lib/site-settings";

const chromeTabs = [
  { id: "header", label: "Header", icon: IconLayoutNavbar },
  { id: "menu", label: "Menu", icon: IconMenu2 },
  { id: "footer", label: "Footer", icon: IconLayoutBottombar }
];

export default function PagesDashboard() {
  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [activeChromeTab, setActiveChromeTab] = useState("header");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [changingHome, setChangingHome] = useState("");
  const [newPage, setNewPage] = useState({ title: "", slug: "", templateSlug: "amorim" });

  useEffect(() => { load(); }, []);

  const contentPages = useMemo(() => pages.filter((page) => page.page_type === "page"), [pages]);

  async function load() {
    setError("");
    const [pagesResponse, settingsResponse] = await Promise.all([fetch("/api/pages", { cache: "no-store" }), fetch("/api/settings", { cache: "no-store" })]);
    if (pagesResponse.status === 401) { window.location.href = "/admin"; return; }
    if (!pagesResponse.ok || !settingsResponse.ok) { setError("Nao foi possivel carregar o painel."); return; }
    const [pagesData, settingsData] = await Promise.all([pagesResponse.json(), settingsResponse.json()]);
    setPages(pagesData.pages || []);
    setSettings(mergeSiteSettings(settingsData.settings));
    setNewPage((current) => ({ ...current, templateSlug: current.templateSlug || pagesData.pages?.find((page) => page.page_type === "page")?.slug || "amorim" }));
  }

  async function saveSettings(event) {
    event?.preventDefault();
    setStatus("Salvando...");
    setError("");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    if (!response.ok) { setStatus(""); setError("Nao foi possivel salvar as configuracoes."); return; }
    const data = await response.json();
    setSettings(mergeSiteSettings(data.settings));
    setStatus("Configuracoes salvas e aplicadas ao site.");
  }

  async function createNewPage(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    const response = await fetch("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(newPage) });
    const data = await response.json().catch(() => ({}));
    setCreating(false);
    if (!response.ok) { setError(data.error || "Nao foi possivel criar a pagina."); return; }
    window.location.href = `/admin/editor/${data.page.slug}`;
  }

  async function setHome(slug) {
    setChangingHome(slug);
    setError("");
    const response = await fetch(`/api/pages/${slug}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_home" }) });
    setChangingHome("");
    if (!response.ok) { setError("Nao foi possivel definir a pagina inicial."); return; }
    setPages((current) => current.map((page) => ({ ...page, is_home: page.slug === slug && page.page_type === "page" })));
    setStatus("Pagina inicial atualizada.");
  }

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) { setError("Nao foi possivel enviar a logo."); return; }
    const data = await response.json();
    updateHeader("logoSrc", data.path);
  }

  function updateHeader(name, value) {
    setSettings((current) => ({ ...current, header: { ...current.header, [name]: value } }));
  }

  function updateFooter(name, value) {
    setSettings((current) => ({ ...current, footer: { ...current.footer, [name]: value } }));
  }

  function updateMenuItem(index, name, value) {
    setSettings((current) => ({ ...current, menu: current.menu.map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item) }));
  }

  function addMenuItem() {
    setSettings((current) => ({ ...current, menu: [...current.menu, { label: "Novo item", href: "/" }] }));
  }

  function removeMenuItem(index) {
    setSettings((current) => ({ ...current, menu: current.menu.filter((_item, itemIndex) => itemIndex !== index) }));
  }

  function moveMenuItem(index, direction) {
    setSettings((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.menu.length) return current;
      const menu = [...current.menu];
      [menu[index], menu[target]] = [menu[target], menu[index]];
      return { ...current, menu };
    });
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
        <div className="admin-topbar-actions"><a className="btn" href="/admin/catalogo"><IconPackage size={18} />Catálogo</a><a className="btn" href="/" target="_blank"><IconExternalLink size={18} />Ver site</a><button className="btn btn-icon" onClick={logout} title="Sair"><IconLogout size={18} /></button></div>
      </header>

      <main className="admin-main">
        <div className="dashboard-heading">
          <div><p className="kicker">Casa Estampa CMS</p><h1 className="admin-title">Paginas do site</h1><p className="admin-subtitle">Crie paginas, escolha a inicial e edite a estrutura compartilhada.</p></div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><IconPlus size={18} />Nova pagina</button>
        </div>

        <section className="page-list-section dashboard-section">
          <div className="section-heading"><div><p className="kicker">Conteudo</p><h2>Paginas</h2></div><span>{contentPages.length} paginas</span></div>
          <div className="page-list">
            {contentPages.map((page) => <article className={`page-row ${page.is_home ? "is-home" : ""}`} key={page.slug}>
              <div className="page-row-title"><strong>{page.title}</strong><small>{page.is_home ? "/ (pagina inicial)" : `/${page.slug}`}</small></div>
              {page.is_home ? <span className="home-badge"><IconHome size={15} />Inicial</span> : <button className="btn" disabled={changingHome === page.slug} onClick={() => setHome(page.slug)}><IconHome size={16} />{changingHome === page.slug ? "Alterando..." : "Definir como inicial"}</button>}
              <a className="btn" href={page.is_home ? "/" : `/${page.slug}`} target="_blank"><IconExternalLink size={17} />Abrir</a>
              <a className="btn btn-primary" href={`/admin/editor/${page.slug}`}><IconPencil size={17} />Editar</a>
            </article>)}
          </div>
        </section>

        <section className="site-chrome-section dashboard-section">
          <div className="section-heading"><div><p className="kicker">Estrutura compartilhada</p><h2>Header, menu e footer</h2></div><span>As alteracoes aparecem em todas as paginas.</span></div>
          <div className="chrome-tabs" role="tablist" aria-label="Partes globais">
            {chromeTabs.map((item) => { const Icon = item.icon; return <button role="tab" aria-selected={activeChromeTab === item.id} className={activeChromeTab === item.id ? "active" : ""} onClick={() => setActiveChromeTab(item.id)} key={item.id}><Icon size={18} />{item.label}</button>; })}
          </div>

          <form className="chrome-editor" onSubmit={saveSettings}>
            {activeChromeTab === "header" ? <div className="chrome-panel">
              <div className="chrome-preview header-preview"><div className="header-brand-preview"><img src={settings.header.iconSrc} alt="" /><img src={settings.header.logoSrc} alt="Previa da logo" /></div><span>{settings.header.ctaLabel}</span></div>
              <div className="chrome-fields"><label className="field"><span>Icone da marca</span><input value={settings.header.iconSrc} onChange={(event) => updateHeader("iconSrc", event.target.value)} /></label><label className="field"><span>Logo escrita</span><input value={settings.header.logoSrc} onChange={(event) => updateHeader("logoSrc", event.target.value)} /></label><label className="upload-field"><IconPhoto size={18} />Enviar logo escrita<input type="file" accept="image/*,.svg" onChange={uploadLogo} /></label><label className="field"><span>Link da logo</span><input value={settings.header.logoHref} onChange={(event) => updateHeader("logoHref", event.target.value)} /></label><label className="field"><span>Texto do botao</span><input value={settings.header.ctaLabel} onChange={(event) => updateHeader("ctaLabel", event.target.value)} /></label><label className="field chrome-field-wide"><span>Link do botao</span><input value={settings.header.ctaHref} onChange={(event) => updateHeader("ctaHref", event.target.value)} /></label></div>
            </div> : null}

            {activeChromeTab === "menu" ? <div className="chrome-panel"><div className="menu-editor-list">
              {settings.menu.map((item, index) => <div className="menu-editor-row" key={index}><span className="menu-order">{index + 1}</span><label className="field"><span>Nome</span><input value={item.label} onChange={(event) => updateMenuItem(index, "label", event.target.value)} /></label><label className="field"><span>Destino</span><input list="site-page-links" value={item.href} onChange={(event) => updateMenuItem(index, "href", event.target.value)} /></label><div className="menu-row-actions"><button type="button" className="btn btn-icon" title="Mover para cima" disabled={index === 0} onClick={() => moveMenuItem(index, -1)}><IconChevronUp size={17} /></button><button type="button" className="btn btn-icon" title="Mover para baixo" disabled={index === settings.menu.length - 1} onClick={() => moveMenuItem(index, 1)}><IconChevronDown size={17} /></button><button type="button" className="btn btn-icon danger" title="Remover item" onClick={() => removeMenuItem(index)}><IconTrash size={17} /></button></div></div>)}
              <button type="button" className="btn menu-add" onClick={addMenuItem}><IconPlus size={17} />Adicionar item</button>
              <datalist id="site-page-links">{contentPages.map((page) => <option key={page.slug} value={page.is_home ? "/" : `/${page.slug}`}>{page.title}</option>)}</datalist>
            </div></div> : null}

            {activeChromeTab === "footer" ? <div className="chrome-panel"><div className="chrome-preview footer-preview"><strong>{settings.footer.brand}</strong><span>{settings.footer.subtitle}</span><small>{settings.footer.site} | {settings.footer.contact}</small></div><div className="chrome-fields"><label className="field"><span>Nome da marca</span><input value={settings.footer.brand} onChange={(event) => updateFooter("brand", event.target.value)} /></label><label className="field"><span>Complemento</span><input value={settings.footer.subtitle} onChange={(event) => updateFooter("subtitle", event.target.value)} /></label><label className="field"><span>Site</span><input value={settings.footer.site} onChange={(event) => updateFooter("site", event.target.value)} /></label><label className="field"><span>Contato</span><input value={settings.footer.contact} onChange={(event) => updateFooter("contact", event.target.value)} /></label></div></div> : null}

            <div className="chrome-save-row"><button className="btn btn-primary"><IconDeviceFloppy size={18} />Salvar {chromeTabs.find((item) => item.id === activeChromeTab)?.label}</button><span>{status}</span></div>
          </form>
        </section>

        <section className="dashboard-section style-settings-section">
          <form className="form-grid" onSubmit={saveSettings}>
            <div className="section-heading"><div><p className="kicker"><IconPalette size={14} />Estilo global</p><h2>Cores e tipografia</h2></div><span>Aplicado em todo o site.</span></div>
            <div className="style-settings-grid"><div className="global-color-fields"><DashboardColorField label="Cor principal" value={settings.primaryColor} onChange={(primaryColor) => setSettings({ ...settings, primaryColor })} /><DashboardColorField label="Cor de destaque" value={settings.accentColor} onChange={(accentColor) => setSettings({ ...settings, accentColor })} /></div><label className="field"><span>Fonte global</span><select value={settings.fontFamily} style={{ fontFamily: settings.fontFamily }} onChange={(event) => setSettings({ ...settings, fontFamily: event.target.value })}>{GOOGLE_FONTS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><div className="font-preview" style={{ fontFamily: settings.fontFamily }}><strong>Casa Estampa</strong><span>Interiores com personalidade.</span></div><label className="field"><span>CSS extra</span><textarea value={settings.css} onChange={(event) => setSettings({ ...settings, css: event.target.value })} placeholder=".hero-title { letter-spacing: 1px; }" /></label></div>
            <div className="chrome-save-row"><button className="btn btn-primary"><IconDeviceFloppy size={18} />Salvar estilo</button><button type="button" className="btn" onClick={load}><IconRefresh size={18} />Recarregar</button></div>
          </form>
        </section>
        {error ? <div className="dashboard-error error-box">{error}</div> : null}
      </main>

      {showCreate ? <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="new-page-title"><div className="admin-modal-head"><div><p className="kicker">Novo conteudo</p><h2 id="new-page-title">Criar pagina</h2></div><button className="btn btn-icon" onClick={() => setShowCreate(false)} title="Fechar"><IconX size={19} /></button></div><form className="form-grid" onSubmit={createNewPage}><label className="field"><span>Titulo da pagina</span><input value={newPage.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Ex.: Tapetes" autoFocus /></label><label className="field"><span>Endereco</span><div className="slug-input"><span>/</span><input value={newPage.slug} onChange={(event) => setNewPage({ ...newPage, slug: slugify(event.target.value) })} placeholder="tapetes" /></div></label><label className="field"><span>Usar como modelo</span><select value={newPage.templateSlug} onChange={(event) => setNewPage({ ...newPage, templateSlug: event.target.value })}>{contentPages.map((page) => <option key={page.slug} value={page.slug}>{page.title}</option>)}</select></label><p className="panel-help">A pagina copia a estrutura do modelo e abre diretamente no editor visual.</p>{error ? <div className="error-box">{error}</div> : null}<div className="modal-actions"><button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button><button className="btn btn-primary" disabled={creating || !newPage.title || !newPage.slug || !newPage.templateSlug}><IconPlus size={18} />{creating ? "Criando..." : "Criar e editar"}</button></div></form></section></div> : null}
    </div>
  );
}

function DashboardColorField({ label, value, onChange }) {
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return <label className="field"><span>{label}</span><div className="color-control"><input type="color" aria-label={`${label} seletor`} value={safeValue} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${label} hexadecimal`} value={value} onChange={(event) => onChange(event.target.value)} /></div></label>;
}

function slugify(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
