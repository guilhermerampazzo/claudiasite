const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    // v2 como versão oficial: as URLs "limpas" servem o conteúdo do v2
    // (Home, Pisos e as 5 páginas congeladas), sem aparecer /v2 na barra.
    const v2 = [
      { source: "/", destination: "/v2-home" },
      { source: "/pisos", destination: "/v2-pisos" },
      { source: "/papeis-de-parede", destination: "/v2/papeis-de-parede" },
      { source: "/cortinas", destination: "/v2/cortinas" },
      { source: "/persianas", destination: "/v2/persianas" },
      { source: "/arquitetos-designers", destination: "/v2/arquitetos-designers" },
      { source: "/corporativo", destination: "/v2/corporativo" }
    ];
    return { beforeFiles: v2, afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }
        ]
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  }
};

export default nextConfig;
