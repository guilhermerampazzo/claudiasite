"use client";

import { useState } from "react";

/*
 * Preview público da Home v2 — sem banco, sem login.
 * O CSS real (página + globais) vem do root.render do Puck, igual ao ar.
 * Navbar + rodapé usam as mesmas classes/CSS do site publicado.
 */

import { Render } from "@measured/puck";
import { puckHomeConfig } from "@/lib/puck/config";
import initialHome from "@/lib/puck/initial-home.json";

const WA = "https://api.whatsapp.com/send?phone=5521999886842";

const MENU = [
  ["Início", "/"],
  ["Papéis de Parede", "/papeis-de-parede"],
  ["Cortinas", "/cortinas"],
  ["Persianas", "/persianas"],
  ["Pisos", "/pisos"],
  ["Arquitetos", "/arquitetos-designers"],
  ["Corporativo", "/corporativo"],
];

export default function V2HomePreview() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <style>{`*,*::before,*::after{box-sizing:border-box;}html,body{margin:0;padding:0;}`}</style>
      <nav className={`navbar${menuOpen ? " is-menu-open" : ""}`}>
        <a href="/" className="navbar-logo">
          <img className="site-logo-icon" src="/assets/logo-icone.svg" alt="Casa Estampa" />
          <img className="site-logo-lettering" src="/assets/logo-letra.svg" alt="Casa Estampa" />
        </a>
        <ul className="navbar-nav">
          {MENU.map(([label, href]) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
        <a href={WA} className="navbar-cta">
          <i className="ti ti-brand-whatsapp" aria-hidden="true" /> Falar agora
        </a>
              <button
          type="button"
          className="navbar-toggle"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="navbar-mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="navbar-contact">
          <a href="tel:+5521999886842">
            <i className="ti ti-phone" aria-hidden="true" /> (21) 99988-6842
          </a>
          <a href="https://casaestampainteriores.lojavirtualnuvem.com.br/" target="_blank" rel="noopener noreferrer">
            <i className="ti ti-lock" aria-hidden="true" /> Loja Virtual
          </a>
        </div>
      </nav>

      <Render config={puckHomeConfig} data={initialHome} />

      <footer className="footer ce-site-footer">
        <div className="ce-footer-main">
          <div className="ce-footer-brand">
            <a href="/" aria-label="Página inicial Casa Estampa">
              <img className="ce-footer-icon" src="/assets/logo-icone.svg" alt="" />
              <img className="ce-footer-lettering" src="/assets/logo-letra.svg" alt="Casa Estampa Interiores" />
            </a>
          </div>
          <nav className="ce-footer-nav" aria-label="Navegação do rodapé">
            <strong>Explore</strong>
            <div>
              {MENU.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
          </nav>
          <div className="ce-footer-contact">
            <strong>Atendimento</strong>
            <a href={WA}>
              <i className="ti ti-brand-whatsapp" aria-hidden="true" />
              Rio de Janeiro · (21) 99988-6842
            </a>
            <span>casaestampa.com</span>
            <div className="ce-footer-address">
              <strong>Showroom</strong>
              <span>Av Alfredo Baltazar da Silveira, 1827 Sala 206</span>
              <span>Recreio dos Bandeirantes</span>
              <span>Rio de Janeiro - RJ</span>
            </div>
          </div>
        </div>
        <div className="ce-footer-bottom">
          <span>© 2026 Casa Estampa. Todos os direitos reservados.</span>
          <a href={WA}>Falar com a Casa Estampa</a>
        </div>
      </footer>

      <a href={WA} className="wa-float" aria-label="Falar pelo WhatsApp">
        <i className="ti ti-brand-whatsapp" aria-hidden="true" />
      </a>
    </>
  );
}
