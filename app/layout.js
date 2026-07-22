import "./admin.css";

export const metadata = {
  title: "Casa Estampa CMS",
  description: "Painel visual para editar as paginas Casa Estampa."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
