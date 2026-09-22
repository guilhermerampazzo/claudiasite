"use client";

/*
 * Admin v2 — índice do novo editor (Puck) por página.
 * Visual alinhado à identidade Casa Estampa (escuro + dourado).
 */

import { PUCK_PAGES } from "@/lib/puck/registry";

export default function AdminV2Index() {
  const pages = Object.values(PUCK_PAGES);
  return (
    <main className="v2-index">
      <header className="v2-index-head">
        <div className="v2-brand">
          <img className="v2-brand-icon" src="/assets/logo-icone.svg" alt="" />
          <img className="v2-brand-lettering" src="/assets/logo-letra.svg" alt="Casa Estampa" />
        </div>
        <div className="v2-index-titles">
          <span className="v2-kicker">Painel de páginas</span>
          <h1>Novo editor</h1>
          <p>
            Escolha uma página para editar e comparar com o site no ar. As alterações ficam em
            rascunho no navegador até você exportar/restaurar.
          </p>
        </div>
        <a className="v2-old" href="/admin/pages">
          <i className="ti ti-arrow-left" aria-hidden="true" /> Painel antigo
        </a>
      </header>

      <section className="v2-grid">
        {pages.map((page) => (
          <article className="v2-card" key={page.slug}>
            <a className="v2-card-media" href={page.previewHref} target="_blank" rel="noreferrer" title={`Ver ${page.titulo}`}>
              {page.thumb ? <img src={page.thumb} alt="" loading="lazy" /> : <span className="v2-card-fallback" />}
              <span className="v2-card-veil" />
              <span className={`v2-tag ${page.frozen ? "is-frozen" : "is-blocks"}`}>
                {page.frozen ? "Conteúdo original" : "Blocos editáveis"}
              </span>
            </a>
            <div className="v2-card-body">
              <h2>{page.titulo}</h2>
              <span className="v2-card-path">/{page.slug === "home" ? "" : page.slug}</span>
            </div>
            <div className="v2-card-actions">
              <a className="v2-btn v2-btn-primary" href={`/admin/v2/${page.slug}`}>
                <i className="ti ti-pencil" aria-hidden="true" /> Editar
              </a>
              <a className="v2-btn" href={page.previewHref} target="_blank" rel="noreferrer">
                <i className="ti ti-eye" aria-hidden="true" /> Preview
              </a>
              <a className="v2-btn v2-btn-ghost" href={page.liveHref} target="_blank" rel="noreferrer">
                <i className="ti ti-external-link" aria-hidden="true" /> No ar
              </a>
            </div>
          </article>
        ))}
      </section>

      <footer className="v2-index-foot">
        <span>Editor v2 · Puck</span>
        <span>Header, menu e rodapé são globais (aparecem em todas as páginas).</span>
      </footer>

      <style>{`
        .v2-index {
          --fendi: #c2a57a;
          --dark: #1c1810;
          --dark-warm: #241d13;
          --dark-card: #2a2218;
          --text-light: #f5f0e8;
          --text-muted: #b8a88a;
          --text-dim: #8a7a62;
          --border: rgba(194,165,122,.25);
          min-height: 100vh;
          margin: 0;
          padding: 48px clamp(20px, 5vw, 72px) 64px;
          background:
            radial-gradient(1200px 500px at 85% -10%, rgba(200,150,12,.10), transparent 60%),
            var(--dark);
          color: var(--text-light);
          font-family: 'Montserrat', Arial, sans-serif;
        }
        .v2-index * { box-sizing: border-box; }

        .v2-index-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: clamp(18px, 3vw, 44px);
          padding-bottom: 34px;
          margin-bottom: 38px;
          border-bottom: 1px solid var(--border);
        }
        .v2-brand { display: flex; align-items: center; gap: 10px; }
        .v2-brand-icon { width: 46px; height: 46px; object-fit: contain; }
        .v2-brand-lettering { height: 58px; max-width: 190px; object-fit: contain; }
        .v2-index-titles { min-width: 0; }
        .v2-kicker {
          display: block; margin-bottom: 10px;
          color: var(--fendi); font-size: 10px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;
        }
        .v2-index-titles h1 {
          margin: 0 0 8px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(34px, 4vw, 52px); font-weight: 300; line-height: 1.05;
        }
        .v2-index-titles p { margin: 0; max-width: 620px; color: var(--text-muted); font-size: 13px; line-height: 1.7; }
        .v2-old {
          display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
          padding: 11px 18px; border: 1px solid var(--border); border-radius: 2px;
          color: var(--text-muted); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none;
          transition: color .2s, border-color .2s;
        }
        .v2-old:hover { color: var(--fendi); border-color: var(--fendi); }

        .v2-grid {
          display: grid; gap: 22px;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        }
        .v2-card {
          display: flex; flex-direction: column;
          background: linear-gradient(180deg, var(--dark-card), #211a11);
          border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
          transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
        }
        .v2-card:hover {
          transform: translateY(-4px);
          border-color: rgba(194,165,122,.6);
          box-shadow: 0 22px 48px rgba(0,0,0,.45);
        }
        .v2-card-media { position: relative; display: block; aspect-ratio: 16/9; overflow: hidden; background: #171208; }
        .v2-card-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
        .v2-card:hover .v2-card-media img { transform: scale(1.04); }
        .v2-card-fallback { position: absolute; inset: 0; background: #171208; }
        .v2-card-veil { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(24,20,12,.15), rgba(24,20,12,.78)); }
        .v2-tag {
          position: absolute; left: 12px; bottom: 12px; z-index: 1;
          padding: 5px 10px; border: 1px solid rgba(194,165,122,.5); border-radius: 2px;
          background: rgba(20,16,10,.6); color: var(--fendi);
          font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
        }
        .v2-tag.is-blocks { color: #e5d4b2; border-color: rgba(229,212,178,.5); }

        .v2-card-body { padding: 18px 18px 6px; }
        .v2-card-body h2 {
          margin: 0 0 4px; font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 26px; font-weight: 400; color: var(--text-light);
        }
        .v2-card-path { color: var(--text-dim); font-size: 11px; letter-spacing: 1px; }

        .v2-card-actions { display: flex; gap: 8px; flex-wrap: wrap; padding: 16px 18px 18px; margin-top: auto; }
        .v2-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 14px; border: 1px solid var(--border); border-radius: 2px;
          background: transparent; color: var(--text-light);
          font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none;
          transition: background .2s, color .2s, border-color .2s;
        }
        .v2-btn:hover { border-color: var(--fendi); color: var(--fendi); }
        .v2-btn-primary { background: var(--fendi); border-color: var(--fendi); color: #1c1810; }
        .v2-btn-primary:hover { background: #c8960c; border-color: #c8960c; color: #1c1810; }
        .v2-btn-ghost { color: var(--text-muted); }

        .v2-index-foot {
          display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
          margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--border);
          color: var(--text-dim); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
        }

        @media (max-width: 760px) {
          .v2-index-head { grid-template-columns: 1fr; }
          .v2-old { justify-self: start; }
          .v2-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
