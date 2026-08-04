export const DEFAULT_SITE_SETTINGS = {
  css: "",
  primaryColor: "#c2a57a",
  accentColor: "#c8960c",
  fontFamily: "Montserrat",
  header: {
    iconSrc: "/assets/logo-icone.svg",
    logoSrc: "/assets/logo-letra.svg",
    logoHref: "/",
    ctaLabel: "Falar agora",
    ctaHref: "https://api.whatsapp.com/send?phone=5521999886842"
  },
  social: {
    instagram: "https://www.instagram.com/casaestampa/",
    facebook: "https://www.facebook.com/casaestampainteriores",
    pinterest: "https://br.pinterest.com/casaestampa/"
  },
  menu: [
    { label: "Papeis de Parede", href: "/papeis-de-parede" },
    { label: "Cortinas", href: "/cortinas" },
    { label: "Persianas", href: "/persianas" },
    { label: "Pisos", href: "/pisos" },
    { label: "Corporativo", href: "/corporativo" },
    { label: "Arquitetos", href: "/arquitetos-designers" }
  ],
  footer: {
    brand: "Casa Estampa",
    subtitle: "Interiores",
    site: "casaestampa.com",
    contact: "Rio de Janeiro - (21) 99988-6842"
  }
};

export function mergeSiteSettings(settings = {}) {
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...settings,
    header: { ...DEFAULT_SITE_SETTINGS.header, ...(settings.header || {}) },
    social: { ...DEFAULT_SITE_SETTINGS.social, ...(settings.social || {}) },
    footer: { ...DEFAULT_SITE_SETTINGS.footer, ...(settings.footer || {}) },
    menu: Array.isArray(settings.menu) ? settings.menu : DEFAULT_SITE_SETTINGS.menu
  };
}
