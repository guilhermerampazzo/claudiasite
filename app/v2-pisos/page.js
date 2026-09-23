"use client";

import { useEffect, useRef } from "react";

/*
 * Preview público Pisos v2 — sem banco, sem login.
 * O CSS real (página + globais) vem do root.render do Puck, igual ao ar.
 */

import { Render } from "@measured/puck";
import { puckPisosConfig } from "@/lib/puck/pisos";
import initialPisos from "@/lib/puck/initial-pisos.json";
import { NAVBAR_INNER, bindNavbarToggle } from "@/lib/navbar";

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

export default function V2PisosPreview() {
  const navRef = useRef(null);
  useEffect(() => bindNavbarToggle(navRef.current), []);
  return (
    <>
      <style>{`html,body{margin:0;padding:0;}`}</style>
      <nav
        ref={navRef}
        className="navbar"
        data-ce-canonical="navbar"
        dangerouslySetInnerHTML={{ __html: NAVBAR_INNER }}
      />

      <Render config={puckPisosConfig} data={initialPisos} />

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
