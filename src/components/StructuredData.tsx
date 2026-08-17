import { EVENT_CONFIG, VENUE, venueLine } from "@/lib/eventConfig";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import type { EventRow } from "@/lib/types";

/**
 * Los datos del market en el formato que entiende Google
 * (schema.org / JSON-LD). Es lo que permite que una búsqueda del nombre
 * muestre la ficha con logo, redes y las próximas fechas, en vez de sólo
 * un link azul.
 *
 * Va como <script> porque así lo pide el formato: no se ve en pantalla,
 * lo leen los buscadores.
 */

interface StructuredDataProps {
  events: EventRow[];
  faqs?: { question: string; answer: string }[];
}

export function StructuredData({ events, faqs = [] }: StructuredDataProps) {
  const sameAs = Object.values(EVENT_CONFIG.socials).filter(Boolean);

  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: EVENT_CONFIG.name,
    url: SITE_URL,
    logo: absoluteUrl("/logo-mofumofu.webp"),
    email: EVENT_CONFIG.contactEmail,
    ...(sameAs.length > 0 && { sameAs }),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: EVENT_CONFIG.name,
    inLanguage: "es-MX",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  // Sin ciudad, un Event sin lugar es un dato incompleto que Google
  // descarta: mejor no publicarlo hasta que VENUE esté lleno.
  const eventNodes = VENUE.city
    ? events.map((event) => ({
        "@type": "Event",
        name: `${EVENT_CONFIG.name} — ${event.name}`,
        startDate: event.date_start,
        endDate: event.date_end,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: [absoluteUrl("/opengraph-image.png")],
        description: `Edición de ${EVENT_CONFIG.name} en ${venueLine()}: expositores independientes, comida, concursos y dinámicas.`,
        url: SITE_URL,
        organizer: { "@id": `${SITE_URL}/#organization` },
        location: {
          "@type": "Place",
          name: VENUE.name || venueLine(),
          ...(VENUE.mapsUrl && { hasMap: VENUE.mapsUrl }),
          address: {
            "@type": "PostalAddress",
            ...(VENUE.street && { streetAddress: VENUE.street }),
            addressLocality: VENUE.city,
            ...(VENUE.state && { addressRegion: VENUE.state }),
            addressCountry: VENUE.country,
          },
        },
      }))
    : [];

  const faqNode =
    faqs.length > 0
      ? [
          {
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]
      : [];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, website, ...eventNodes, ...faqNode],
  };

  return (
    <script
      type="application/ld+json"
      // El contenido sale de nuestra propia configuración, no de nada
      // que escriba un visitante.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
