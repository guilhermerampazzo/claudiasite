export const PAGE_SEO_DESCRIPTIONS = {
  amorim: "Persianas e cortinas Amorim sob medida: rolo, romana, painel, tela solar e blackout. Medição técnica e instalação especializada pela Casa Estampa.",
  "amorim-tela-solar": "Coleção Tela Solar Amorim: persianas com controle de luminosidade e proteção UV para ambientes residenciais e corporativos no Rio de Janeiro.",
  "arquitetos-designers": "Área exclusiva para arquitetos e designers de interiores: condições especiais, catálogos técnicos e suporte dedicado da Casa Estampa Interiores.",
  corporativo: "Soluções em papel de parede, cortinas, persianas e pisos para escritórios, hotéis, clínicas e áreas comerciais. Projetos corporativos sob medida.",
  cortinas: "Cortinas sob medida com curadoria de tecidos nacionais e internacionais, medição técnica e instalação profissional. Cortinas motorizadas disponíveis.",
  "papeis-de-parede": "Mais de 60 álbuns de papel de parede: florais, texturas, infantil e painéis personalizados. Medição, entrega e instalação em todo o Rio de Janeiro.",
  persianas: "Persianas sob medida: rolo, romana, double vision, verticais e horizontais. Medição técnica, fabricação e instalação especializada.",
  pisos: "Pisos laminados, vinílicos e carpetes das principais marcas do mercado. Orçamento online, parcelamento e instalação completa."
};

export function getPageSeoDescription(slug) {
  return PAGE_SEO_DESCRIPTIONS[slug] || null;
}
