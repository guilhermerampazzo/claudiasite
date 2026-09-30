"use client";

/* Registro das páginas no novo editor (v2). */

import { puckHomeConfig } from "./config.js";
import initialHome from "./initial-home.json";
import { puckPisosConfig } from "./pisos.js";
import initialPisos from "./initial-pisos.json";
import { makeFrozenConfig } from "./frozen.js";

const FROZEN = [
  { slug: "papeis-de-parede", titulo: "Papéis de Parede", thumb: "/uploads/capas/papel-parede.jpg?v=20260923b", bodyClass: "ce-slug-papeis-de-parede page-template-elementor_canvas page page-id-26152 theme-astra elementor-default elementor-template-canvas elementor-page elementor-page-26152" },
  { slug: "cortinas", titulo: "Cortinas", thumb: "/uploads/capas/cortinas.jpg", bodyClass: "ce-slug-cortinas page-template-elementor_canvas page page-id-26162 theme-astra elementor-default elementor-template-canvas elementor-page elementor-page-26162" },
  { slug: "persianas", titulo: "Persianas", thumb: "/uploads/capas/persiana.jpg?v=20260923b", bodyClass: "ce-slug-persianas page-template-elementor_canvas page page-id-26209 theme-astra elementor-default elementor-template-canvas elementor-page elementor-page-26209" },
  { slug: "arquitetos-designers", titulo: "Arquitetos & Designers", thumb: "/uploads/capas/arquiteto-design.jpg", bodyClass: "ce-slug-arquitetos-designers" },
  { slug: "corporativo", titulo: "Corporativo", thumb: "/uploads/capas/corporativo.jpg", bodyClass: "ce-slug-corporativo page-template-default page page-id-26166 theme-astra elementor-default elementor-page elementor-page-26166" },
];

const frozenEntries = Object.fromEntries(
  FROZEN.map(({ slug, titulo, thumb, bodyClass }) => [
    slug,
    {
      slug,
      titulo,
      thumb,
      frozen: true,
      config: makeFrozenConfig(`/puck/pages/${slug}.css`, bodyClass),
      dataUrl: `/puck/pages/${slug}.json`,
      storageKey: `ce-puck-${slug}-v1`,
      previewHref: `/${slug}`,
      liveHref: `https://claudia.codermaster.com.br/${slug}`,
    },
  ])
);

export const PUCK_PAGES = {
  home: {
    slug: "home",
    titulo: "Home",
    thumb: "/uploads/capas/home.jpg",
    config: puckHomeConfig,
    initial: initialHome,
    storageKey: "ce-puck-home-v1",
    previewHref: "/",
    liveHref: "https://claudia.codermaster.com.br/",
  },
  pisos: {
    slug: "pisos",
    titulo: "Pisos",
    thumb: "/uploads/capas/pisos.jpg",
    config: puckPisosConfig,
    initial: initialPisos,
    storageKey: "ce-puck-pisos-v1",
    previewHref: "/pisos",
    liveHref: "https://claudia.codermaster.com.br/pisos",
  },
  ...frozenEntries,
};

export function getPuckPage(slug) {
  return PUCK_PAGES[slug] || null;
}
