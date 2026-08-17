import type { Metadata } from "next";
import { DM_Mono, M_PLUS_Rounded_1c, Nunito } from "next/font/google";
import { EVENT_CONFIG, cityLine } from "@/lib/eventConfig";
import { SITE_URL } from "@/lib/site";
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

const where = cityLine();

// La descripción es lo que Google muestra debajo del título, así que
// dice qué es el market y para quién, no lo que hace la web.
const description = [
  `${EVENT_CONFIG.name} es un mercado kawaii con expositores independientes, comida, concursos y dinámicas`,
  where ? `en ${where}` : "",
  "— aparta tu stand como expositor o inscríbete en las convocatorias.",
]
  .filter(Boolean)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Lo que se ve en el resultado de Google al buscar el nombre.
    default: `${EVENT_CONFIG.name} — Mercado kawaii${where ? ` en ${where}` : ""}`,
    // Las demás páginas sólo ponen su nombre; el sufijo lo pone esto.
    template: `%s · ${EVENT_CONFIG.name}`,
  },
  description,
  applicationName: EVENT_CONFIG.name,
  keywords: [
    "MofuMofu Market",
    "mofumofu market",
    "mercado kawaii",
    "bazar kawaii",
    "bazar anime",
    "expositores",
    "registro de expositores",
    "concurso de cosplay",
    "dance cover",
    "torneo TCG",
    where,
  ].filter(Boolean),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: SITE_URL,
    siteName: EVENT_CONFIG.name,
    title: `${EVENT_CONFIG.name} — Mercado kawaii${where ? ` en ${where}` : ""}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${EVENT_CONFIG.name} — Mercado kawaii${where ? ` en ${where}` : ""}`,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
