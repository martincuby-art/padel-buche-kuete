import "./globals.css";

export const metadata = {
  title: "Pádel Buche Kuete",
  description: "Ranking, resultados y noticias del grupo",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0E4B44",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
