"use client";

import { useEffect, useState } from "react";
import { IconArrowLeft, IconDeviceFloppy, IconExternalLink, IconFolder, IconPackage, IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";

const emptyCategory = { name: "", description: "", image_url: "", parent_source_id: "", sort_order: 0 };
const emptyProduct = { name: "", sku: "", description: "", short_description: "", image_url: "", category_ids: [] };

export default function CatalogAdmin() {
  const [tab, setTab] = useState("categories");
  const [stats, setStats] = useState({ categories: 0, products: 0 });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { const timer = setTimeout(() => loadList(), 250); return () => clearTimeout(timer); }, [tab, query]);

  async function request(url, options) {
    const response = await fetch(url, { cache: "no-store", ...options });
    if (response.status === 401) { window.location.href = "/admin"; throw new Error("Sessão expirada."); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a ação.");
    return data;
  }

  async function loadAll() {
    try {
      const [summary, categoryData] = await Promise.all([request("/api/catalog"), request("/api/catalog?type=categories")]);
      setStats(summary); setCategories(categoryData.categories || []); await loadList();
    } catch (error) { setStatus(error.message); }
  }

  async function loadList() {
    try {
      const data = await request(`/api/catalog?type=${tab}&q=${encodeURIComponent(query)}`);
      if (tab === "categories") setCategories(data.categories || []); else setProducts(data.products || []);
    } catch (error) { setStatus(error.message); }
  }

  function startCreate() {
    setCreating(true); setSelected(tab === "categories" ? { ...emptyCategory } : { ...emptyProduct }); setStatus("");
  }

  async function uploadImage(file) {
    if (!file) return;
    const form = new FormData(); form.append("file", file);
    try {
      const data = await request("/api/uploads", { method: "POST", body: form });
      setSelected((item) => ({ ...item, image_url: data.path, images: [{ src: data.path, thumbnail: data.path }] }));
    } catch (error) { setStatus(error.message); }
  }

  async function save(event) {
    event.preventDefault(); setStatus("Salvando...");
    const base = tab === "categories" ? "categories" : "products";
    const url = creating ? `/api/catalog/${base}` : `/api/catalog/${base}/${selected.source_id}`;
    try {
      await request(url, { method: creating ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(selected) });
      setStatus("Alterações salvas."); setSelected(null); setCreating(false); await loadAll();
    } catch (error) { setStatus(error.message); }
  }

  async function sync() {
    setSyncing(true); setStatus("Sincronizando categorias e produtos do catálogo antigo...");
    try {
      const result = await request("/api/catalog/sync", { method: "POST" });
      setStatus(`${result.categoriesCount} categorias e ${result.productsCount} produtos sincronizados.`); await loadAll();
    } catch (error) { setStatus(error.message); }
    setSyncing(false);
  }

  return <div className="admin-shell"><header className="admin-topbar"><a className="admin-brand" href="/admin/pages"><img src="/assets/logo-icone.svg" alt="" /><img src="/assets/logo-letra.svg" alt="Casa Estampa" /></a><div className="admin-topbar-actions"><a className="btn" href="/admin/pages"><IconArrowLeft size={18}/>Páginas</a><a className="btn" href="/catalogo" target="_blank"><IconExternalLink size={18}/>Ver catálogo</a></div></header>
    <main className="admin-main catalog-admin"><div className="dashboard-heading"><div><p className="kicker">Catálogo</p><h1 className="admin-title">Álbuns e produtos</h1><p className="admin-subtitle">Organize categorias, capas, descrições e produtos em um só lugar.</p></div><button className="btn" onClick={sync} disabled={syncing}><IconRefresh size={18}/>{syncing ? "Sincronizando..." : "Sincronizar WordPress"}</button></div>
      <div className="catalog-stats"><div><IconFolder/><span><strong>{stats.categories}</strong>Categorias e álbuns</span></div><div><IconPackage/><span><strong>{stats.products}</strong>Produtos</span></div><div className="catalog-sync-info"><span>Última sincronização</span><strong>{stats.last_sync?.finished_at ? new Date(stats.last_sync.finished_at).toLocaleString("pt-BR") : "Ainda não realizada"}</strong></div></div>
      <section className="dashboard-section"><div className="catalog-toolbar"><div className="chrome-tabs"><button className={tab === "categories" ? "active" : ""} onClick={() => {setTab("categories");setSelected(null)}}><IconFolder size={18}/>Categorias</button><button className={tab === "products" ? "active" : ""} onClick={() => {setTab("products");setSelected(null)}}><IconPackage size={18}/>Produtos</button></div><label className="catalog-search"><IconSearch size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${tab === "categories" ? "categoria" : "produto"}...`}/></label><button className="btn btn-primary" onClick={startCreate}><IconPlus size={18}/>Adicionar</button></div>
        <div className="catalog-admin-grid"><div className="catalog-table"><div className="catalog-table-head"><span>Nome</span><span>{tab === "categories" ? "Caminho" : "Referência"}</span><span>Status</span></div>{(tab === "categories" ? categories : products).map((item) => <button key={item.source_id} className={selected?.source_id === item.source_id ? "selected" : ""} onClick={() => {setSelected({...item, image_url:item.image_url || item.images?.[0]?.src || ""});setCreating(false)}}><span><strong>{item.name}</strong><small>ID {item.source_id}</small></span><span>{tab === "categories" ? `/${item.path}` : item.sku || "Sem referência"}</span><em className={item.active ? "active" : ""}>{item.active ? "Publicado" : "Oculto"}</em></button>)}{!(tab === "categories" ? categories : products).length ? <div className="catalog-empty-admin">Nenhum item encontrado.</div> : null}</div>
          <aside className="catalog-edit-panel">{selected ? <form onSubmit={save}><div className="section-heading"><div><p className="kicker">{creating ? "Novo item" : "Editar"}</p><h2>{tab === "categories" ? "Categoria ou álbum" : "Produto"}</h2></div></div><label className="field"><span>Nome</span><input value={selected.name || ""} onChange={(e)=>setSelected({...selected,name:e.target.value})} required/></label>{tab === "products" ? <label className="field"><span>Referência</span><input value={selected.sku || ""} onChange={(e)=>setSelected({...selected,sku:e.target.value})}/></label> : null}<label className="field"><span>Descrição</span><textarea value={selected.description || ""} onChange={(e)=>setSelected({...selected,description:e.target.value})}/></label>{creating && tab === "categories" ? <label className="field"><span>Categoria acima</span><select value={selected.parent_source_id || ""} onChange={(e)=>setSelected({...selected,parent_source_id:e.target.value})}><option value="">Nenhuma (categoria principal)</option>{categories.map((item)=><option key={item.source_id} value={item.source_id}>{item.path}</option>)}</select></label> : null}{tab === "products" ? <label className="field"><span>Categoria principal</span><select value={selected.category_ids?.[0] || ""} onChange={(e)=>setSelected({...selected,category_ids:e.target.value ? [Number(e.target.value)] : []})}><option value="">Selecione</option>{categories.map((item)=><option key={item.source_id} value={item.source_id}>{item.path}</option>)}</select></label> : null}<label className="field"><span>Imagem ou capa</span><input value={selected.image_url || ""} onChange={(e)=>setSelected({...selected,image_url:e.target.value})} placeholder="https://..."/><input type="file" accept="image/*" onChange={(e)=>uploadImage(e.target.files?.[0])}/></label>{!creating ? <label className="catalog-toggle"><input type="checkbox" checked={selected.active !== false} onChange={(e)=>setSelected({...selected,active:e.target.checked})}/><span>Publicado no site</span></label> : null}<button className="btn btn-primary catalog-save"><IconDeviceFloppy size={18}/>Salvar</button></form> : <div className="catalog-editor-empty"><IconPackage size={36}/><strong>Selecione um item</strong><span>Clique em uma linha para editar os detalhes.</span></div>}</aside></div>
      </section>{status ? <div className="catalog-status">{status}</div> : null}</main></div>;
}
