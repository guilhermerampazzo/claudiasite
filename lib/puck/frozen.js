"use client";

/*
 * Páginas "congeladas" no editor Puck.
 *
 * Cada seção é o markup ORIGINAL da página. O componente Secao injeta o HTML
 * exato no DOM (mesmas tags/atributos → mesmo layout e CSS), e o CSS completo
 * (página + overrides globais) é carregado no root. Assim o editor e a
 * publicação reproduzem o site no ar fielmente, por construção.
 */

import { useEffect, useRef } from "react";
import { googleFontsStylesheet } from "../editor-options.js";

const PUCK_FONTS = ["Cormorant Garamond", "EB Garamond", "Great Vibes", "Italiana", "Montserrat", "Roboto"];

export function Secao({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    el.replaceWith(tpl.content);
  }, [html]);
  return <span ref={ref} style={{ display: "none" }} aria-hidden="true" />;
}

export function makeFrozenConfig(cssHref) {
  return {
    cssHref,
    root: {
      fields: {},
      defaultProps: {},
      render: ({ children }) => (
        <>
          <link rel="stylesheet" href={cssHref} />
          <link rel="stylesheet" href={googleFontsStylesheet(PUCK_FONTS)} />
          <link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
          {children}
        </>
      ),
    },
    components: {
      Secao: {
        label: "Seção (conteúdo original)",
        fields: {
          rotulo: { type: "text", label: "Rótulo (só no editor)" },
          html: { type: "textarea", label: "HTML da seção" },
        },
        defaultProps: { rotulo: "", html: "" },
        render: (props) => <Secao {...props} />,
      },
    },
  };
}
