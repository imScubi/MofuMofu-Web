import type { Metadata } from "next";

// Ninguna pantalla del panel debe salir en Google. robots.txt ya lo pide,
// pero eso sólo evita que lo rastreen: esta etiqueta evita además que una
// URL del panel se indexe si alguien la enlaza desde fuera.
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
