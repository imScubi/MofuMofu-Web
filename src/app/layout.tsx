import type { Metadata } from "next";
import { DM_Mono, M_PLUS_Rounded_1c, Nunito } from "next/font/google";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import "./globals.css";

// Títulos. Sustituye a Baloo 2: igual de redonda, más pesos y se
// parece mucho más al logo.
const mplus = M_PLUS_Rounded_1c({
  variable: "--font-mplus",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

// Sólo para folio, CLABE, tarjeta y montos: es lo que hace que el
// paso de pago se lea preciso en vez de decorativo.
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: `${EVENT_CONFIG.name} — Registro de expositores`,
  description: `Reserva tu stand para ${EVENT_CONFIG.name} y completa tu registro como expositor.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${mplus.variable} ${nunito.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
