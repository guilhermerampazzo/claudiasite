// ── CABEÇALHO ÚNICO Casa Estampa ──────────────────────────────────────────
// Fonte ÚNICA do navbar em todo o site (a cliente pediu "todas as páginas com
// o cabeçalho da home"). Qualquer edição aqui vale para:
//   • /            (app/v2-home)
//   • /pisos       (app/v2-pisos)
//   • páginas congeladas do v2 (public/puck/pages/*.head.html)
//   • páginas do banco: álbuns, produtos, catálogo, categorias, páginas CMS
//     (via getHomeHeaderHtml() em lib/db.js)
// O visual (grade de 2 linhas no mobile, cores do botão, linha de telefone/Loja
// Virtual) fica em public/puck/navbar.css, carregado por último em todas.

export const NAVBAR_HTML = `<nav class="navbar" data-ce-canonical="navbar"><a href="/" class="navbar-logo"><img class="site-logo-icon" src="/assets/logo-icone.svg" alt="Casa Estampa"/><img class="site-logo-lettering" src="/assets/logo-letra.svg" alt="Casa Estampa"/></a><ul class="navbar-nav" id="navbar-mobile-menu"><li><a href="/">Início</a></li><li><a href="/papeis-de-parede">Papéis de Parede</a></li><li><a href="/cortinas">Cortinas</a></li><li><a href="/persianas">Persianas</a></li><li><a href="/pisos">Pisos</a></li><li><a href="/arquitetos-designers">Arquitetos</a></li><li><a href="/corporativo">Corporativo</a></li></ul><a href="https://api.whatsapp.com/send?phone=5521999886842" class="navbar-cta"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> Falar agora</a><button type="button" class="navbar-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="navbar-mobile-menu"><span></span><span></span><span></span></button><div class="navbar-contact"><a href="tel:+5521999886842"><i class="ti ti-phone" aria-hidden="true"></i> (21) 99988-6842</a><a href="https://casaestampainteriores.lojavirtualnuvem.com.br/" target="_blank" rel="noopener noreferrer"><i class="ti ti-lock" aria-hidden="true"></i> Loja Virtual</a></div></nav>`;

// Conteúdo interno (para o React montar o <nav> com classe/estado próprio).
export const NAVBAR_INNER = NAVBAR_HTML.replace(/^<nav\b[^>]*>/, "").replace(/<\/nav>$/, "");

// Link do CSS do cabeçalho — precisa ser o ÚLTIMO stylesheet da página.
export const NAVBAR_CSS_LINK = `<link id="casa-estampa-navbar" rel="stylesheet" href="/puck/navbar.css">`;

// Liga o botão do menu mobile num <nav> já montado via HTML (fora do React).
// Usa `onclick =` (e não addEventListener) para ser idempotente: StrictMode do
// dev monta/desmonta o effect duas vezes e addEventListener duplicava o handler
// (abria e o aria/estado voltava errado).
// `onChange(aberto)` mantém o estado do React em dia com a classe do DOM.
export function bindNavbarToggle(nav, onChange) {
  if (!nav) return () => {};
  const btn = nav.querySelector(".navbar-toggle");
  if (!btn) return () => {};
  btn.onclick = () => {
    const aberto = nav.classList.toggle("is-menu-open");
    btn.setAttribute("aria-expanded", aberto ? "true" : "false");
    if (typeof onChange === "function") onChange(aberto);
  };
  return () => { btn.onclick = null; };
}
