import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${EVENT_CONFIG.name} — Registro de expositores`,
  description: `Reserva tu stand para ${EVENT_CONFIG.name} y completa tu registro como expositor.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
