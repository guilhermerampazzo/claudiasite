"use client";

/* Puck config — Pisos (usa /puck/pisos.css, extraído do ar). */

import {
  WA,
  makeRootRender,
  passoFields,
  HeroFoto,
  Diferenciais,
  TiposCards,
  TabelaComp,
  Mostruario,
  GaleriaTabs,
  Passos,
  CtaPisos,
} from "./library.js";

const simNao = (label) => ({
  type: "select",
  label,
  options: [
    { label: "Não", value: "no" },
    { label: "Sim", value: "yes" },
  ],
});

export const puckPisosConfig = {
  cssHref: "/puck/pisos.css",
  root: {
    fields: {
      title: { type: "text", label: "Título da página (SEO)" },
    },
    defaultProps: { title: "Pisos Laminados e Vinílicos — Casa Estampa" },
    render: makeRootRender("/puck/pisos.css"),
  },  components: {
    HeroFoto: {
      label: "Hero foto",
      fields: {
        bgImage: { type: "text", label: "Foto de fundo" },
        bgWord: { type: "text", label: "Palavra de fundo" },
        showLabel: {
          type: "select",
          label: "Exibir etiqueta?",
          options: [
            { label: "Não (igual ao ar)", value: "no" },
            { label: "Sim", value: "yes" },
          ],
        },
        showTitle: {
          type: "select",
          label: "Exibir título?",
          options: [
            { label: "Não (igual ao ar)", value: "no" },
            { label: "Sim", value: "yes" },
          ],
        },
        showSub: {
          type: "select",
          label: "Exibir subtítulo?",
          options: [
            { label: "Não (igual ao ar)", value: "no" },
            { label: "Sim", value: "yes" },
          ],
        },
        label: { type: "text", label: "Etiqueta" },
        titleA: { type: "text", label: "Título (linha 1)" },
        meio: { type: "text", label: "Palavra de ligação (ex: seu)" },
        highlight: { type: "text", label: "Destaque dourado" },
        titleB: { type: "text", label: "Título (linha 3, opcional)" },
        sub: { type: "textarea", label: "Subtítulo" },
        primaryLabel: { type: "text", label: "Botão 1 — texto" },
        primaryHref: { type: "text", label: "Botão 1 — destino" },
        secondaryLabel: { type: "text", label: "Botão 2 — texto" },
        secondaryHref: { type: "text", label: "Botão 2 — destino" },
      },
      defaultProps: {
        bgImage: "/uploads/capas/pisos.jpg",
        bgWord: "Pisos",
        showLabel: "no",
        showTitle: "no",
        showSub: "no",
        label: "",
        titleA: "",
        meio: "seu",
        highlight: "",
        titleB: "",
        sub: "",
        primaryLabel: "",
        primaryHref: "#tipos",
        secondaryLabel: "",
        secondaryHref: WA,
      },
      render: (props) => <HeroFoto {...props} />,
    },
    Diferenciais: {
      label: "Diferenciais",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque" },
        desc: { type: "textarea", label: "Texto de apoio" },
        items: { type: "array", label: "Itens", getItemSummary: (i) => i.nome || "Item", arrayFields: passoFields },
      },
      defaultProps: { eyebrow: "", title: "", highlight: "", desc: "", items: [] },
      render: (props) => <Diferenciais {...props} />,
    },
    TiposCards: {
      label: "Tipos (cards)",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque" },
        items: {
          type: "array",
          label: "Cards",
          getItemSummary: (i) => i.nome || "Card",
          arrayFields: {
            icon: { type: "text", label: "Ícone (ti …)" },
            tag: { type: "text", label: "Etiqueta superior" },
            nome: { type: "text", label: "Nome" },
            desc: { type: "textarea", label: "Descrição" },
            badge: { type: "text", label: "Selo" },
          },
        },
      },
      defaultProps: { eyebrow: "", title: "", highlight: "", items: [] },
      render: (props) => <TiposCards {...props} />,
    },
    TabelaComp: {
      label: "Comparativo (tabela)",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque" },
        columns: { type: "array", label: "Colunas (5)", getItemSummary: (i) => i.value || "Coluna", arrayFields: { value: { type: "text", label: "Nome da coluna" } } },
        rows: {
          type: "array",
          label: "Linhas",
          getItemSummary: (i) => i.tipo || "Linha",
          arrayFields: {
            tipo: { type: "text", label: "Tipo (1ª coluna)" },
            valores: { type: "textarea", label: "Valores (1 por linha, 4 linhas)" },
            fortes: { type: "text", label: "Destaques dourados (nºs separados por vírgula)" },
          },
        },
      },
      defaultProps: { eyebrow: "", title: "", highlight: "", columns: [], rows: [] },
      render: (props) => <TabelaComp {...props} columns={(props.columns || []).map((c) => (typeof c === "string" ? c : c.value))} />,
    },
    Mostruario: {
      label: "Mostruário",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        tituloGrande: simNao("Título grande (45px)?"),
        desc: { type: "textarea", label: "Descrição" },
        brands: {
          type: "array",
          label: "Marcas",
          getItemSummary: (i) => i.name || "Marca",
          arrayFields: {
            name: { type: "text", label: "Marca" },
            href: { type: "text", label: "Link do mostruário" },
          },
        },
        ctaLabel: { type: "text", label: "Botão — texto" },
        ctaHref: { type: "text", label: "Botão — destino" },
        video: { type: "text", label: "Vídeo (URL ou /uploads/…)" },
        videoCaption: { type: "text", label: "Legenda do vídeo" },
        photos: {
          type: "array",
          label: "Fotos (vazio = placeholder)",
          getItemSummary: (_, i) => `Foto ${i + 1}`,
          arrayFields: {
            src: { type: "text", label: "Imagem" },
            alt: { type: "text", label: "Texto alternativo" },
            fundo: {
              type: "select",
              label: "Como fundo (não <img>)?",
              options: [
                { label: "Não", value: "no" },
                { label: "Sim", value: "yes" },
              ],
            },
            modo: {
              type: "select",
              label: "Enquadramento",
              options: [
                { label: "Preencher (cover)", value: "cover" },
                { label: "Mostrar inteira (contain)", value: "contain" },
              ],
            },
          },
        },
      },
      defaultProps: { eyebrow: "", title: "", tituloGrande: "no", desc: "", brands: [], ctaLabel: "", ctaHref: WA, video: "", videoCaption: "", photos: [] },
      render: (props) => <Mostruario {...props} />,
    },
    GaleriaTabs: {
      label: "Galeria com abas",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque" },
        tabs: {
          type: "array",
          label: "Abas",
          getItemSummary: (i) => i.label || "Aba",
          arrayFields: {
            id: { type: "text", label: "ID (sem espaço, ex: laminado)" },
            label: { type: "text", label: "Rótulo" },
          },
        },
        photos: {
          type: "array",
          label: "Fotos (vazio = placeholder)",
          getItemSummary: (i) => `${i.tab || "?"} — ${(i.src || "placeholder").slice(0, 30)}`,
          arrayFields: {
            tab: { type: "text", label: "ID da aba" },
            src: { type: "text", label: "Imagem (vazio = placeholder)" },
            alt: { type: "text", label: "Texto alternativo" },
          },
        },
      },
      defaultProps: { eyebrow: "", title: "", highlight: "", tabs: [], photos: [] },
      render: (props) => <GaleriaTabs {...props} />,
    },
    Passos: {
      label: "Passos (processo)",
      fields: {
        eyebrow: { type: "text", label: "Etiqueta" },
        title: { type: "text", label: "Título" },
        highlight: { type: "text", label: "Destaque" },
        sub: { type: "text", label: "Subtítulo" },
        items: { type: "array", label: "Passos", getItemSummary: (i) => i.nome || "Passo", arrayFields: passoFields },
      },
      defaultProps: { eyebrow: "", title: "", highlight: "", sub: "", items: [] },
      render: (props) => <Passos {...props} />,
    },
    CtaPisos: {
      label: "CTA segmentos",
      fields: {
        bgWord: { type: "text", label: "Palavra de fundo" },
        label: { type: "text", label: "Etiqueta" },
        titleA: { type: "text", label: "Título (linha 1)" },
        meio: { type: "text", label: "Palavra de ligação" },
        highlight: { type: "text", label: "Destaque dourado" },
        titleB: { type: "text", label: "Título (linha 2)" },
        desc: { type: "textarea", label: "Descrição" },
        primaryLabel: { type: "text", label: "Botão 1 — texto" },
        primaryHref: { type: "text", label: "Botão 1 — destino" },
        secondaryLabel: { type: "text", label: "Botão 2 — texto" },
        secondaryHref: { type: "text", label: "Botão 2 — destino" },
        segs: { type: "array", label: "Segmentos", getItemSummary: (i) => i.label || "Segmento", arrayFields: { label: { type: "text", label: "Nome" } } },
        phone: { type: "text", label: "Linha de telefone" },
      },
      defaultProps: { bgWord: "", label: "", titleA: "", meio: "", highlight: "", titleB: "", desc: "", primaryLabel: "", primaryHref: WA, secondaryLabel: "", secondaryHref: WA, segs: [], phone: "" },
      render: (props) => <CtaPisos {...props} />,
    },
  },
};
