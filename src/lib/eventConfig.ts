// Configuración general — lo que NO cambia entre ediciones del evento.
// Las fechas y la fecha límite de pago viven por edición en la tabla
// "events" y se administran desde /admin/eventos.
export const EVENT_CONFIG = {
  name: "MofuMofu Market",
  tagline: "Registro de expositores",
  currency: "MXN",
  // Datos bancarios a mostrar al expositor para hacer su transferencia.
  bankInfo: {
    bank: "STP Plata",
    accountHolder: "Roberto Renne Coronado Luna",
    clabe: "646192405603826008",
    cardNumber: "5324 1089 9295 3850",
    concept: "Nombre de tu negocio + número de stand",
  },
  contactEmail: "mofumofuu.market@gmail.com",
  contactWhatsapp: "8127562745",
  // Redes oficiales. Google las usa para amarrar la web con las cuentas
  // del market y mostrarlas juntas cuando alguien busca el nombre.
  socials: {
    instagram: "https://www.instagram.com/mofumofuu.market/",
    facebook: "https://www.facebook.com/share/1Gjf2N4UWe/",
    tiktok: "https://www.tiktok.com/@mofu.mofu.market",
  },
} as const;

// Sede por defecto: la que se usa cuando una edición no trae la suya.
//
// El market no tiene sede fija, así que cada edición puede sobrescribir
// el parque y la ciudad desde /admin/dashboard/eventos. Esto es lo que
// se usa para hablar del market en general (título del sitio, texto de
// la portada) y como respaldo de las ediciones sin sede.
interface Venue {
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  mapsUrl: string;
}

export const VENUE: Venue = {
  /** El parque donde más se ha hecho. */
  name: "Parque Clouthier",
  /** Calle y número, si algún día hace falta. */
  street: "",
  city: "Monterrey",
  state: "Nuevo León",
  country: "México",
  mapsUrl: "https://maps.app.goo.gl/SZvuDYUTeDRge2Cg8",
};

/** "Parque Clouthier, Monterrey, Nuevo León" con lo que esté lleno. */
export function venueLine(): string {
  return [VENUE.name, VENUE.city, VENUE.state].filter(Boolean).join(", ");
}

/**
 * "Monterrey, Nuevo León" — sin el parque.
 *
 * Es lo que va en el título y la descripción del sitio: la sede cambia
 * entre ediciones, así que el nombre del parque ahí sería mentira a
 * medias, y además un título largo lo corta Google a la mitad.
 */
export function cityLine(): string {
  return [VENUE.city, VENUE.state].filter(Boolean).join(", ");
}

/**
 * La sede de una edición concreta: la suya si la tiene, y si no la de
 * por defecto. Devuelve también el link de mapa que corresponda, para no
 * mandar a alguien al parque equivocado.
 *
 * Con ciudad propia no se asume el estado ni el parque de siempre: una
 * edición en otra ciudad puede estar en otro estado, y dar por hecho
 * "Nuevo León" mandaría a la gente a otro lado. Si esa sede está fuera
 * del estado, se escribe en el mismo campo ("Saltillo, Coahuila").
 */
export function eventVenue(event: {
  venue_name?: string | null;
  venue_city?: string | null;
  venue_maps_url?: string | null;
}): { name: string; city: string; state: string; line: string; mapsUrl: string } {
  const ownCity = Boolean(event.venue_city);

  const name = event.venue_name || (ownCity ? "" : VENUE.name);
  const city = event.venue_city || VENUE.city;
  const state = ownCity ? "" : VENUE.state;
  const mapsUrl =
    event.venue_maps_url ||
    (event.venue_name || ownCity ? "" : VENUE.mapsUrl);

  return {
    name,
    city,
    state,
    line: [name, city, state].filter(Boolean).join(", "),
    mapsUrl,
  };
}

// Planes de precio para el stand. El expositor elige uno después de
// seleccionar su lugar en el mapa. El precio y lo que incluye vienen de
// aquí, no del stand en sí.
export interface PricingPlan {
  id: string;
  category: "varios" | "comida";
  categoryLabel: string;
  days: 1 | 2;
  price: number;
  /** Plan compartido: el negocio comparte el stand con otro que el equipo organizador asigna. */
  shared: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  { id: "varios_1", category: "varios", categoryLabel: "Expositores varios", days: 1, price: 2000, shared: false },
  { id: "varios_2", category: "varios", categoryLabel: "Expositores varios", days: 2, price: 2800, shared: false },
  { id: "comida_1", category: "comida", categoryLabel: "Expositores de comida", days: 1, price: 2300, shared: false },
  { id: "comida_2", category: "comida", categoryLabel: "Expositores de comida", days: 2, price: 3000, shared: false },
  { id: "compartido_1", category: "varios", categoryLabel: "Compartido varios", days: 1, price: 1300, shared: true },
  { id: "compartido_2", category: "varios", categoryLabel: "Compartido varios", days: 2, price: 2100, shared: true },
];

export const STAND_INCLUDES = [
  "Toldo de 3x3 metros",
  "Una mesa de 1.8 m x 74 cm",
  "2 sillas",
  "Participación en dinámicas",
  "Promoción en redes",
];

export const SHARED_PLAN_NOTICE =
  "Compartirás tu stand con otro negocio que el equipo organizador te asignará. Solo se admite un negocio por espacio compartido en este registro.";

export const BUSINESS_CATEGORIES = [
  "Comida y bebidas",
  "Ropa y accesorios",
  "Arte e ilustración",
  "Manualidades y artesanías",
  "Belleza y cuidado personal",
  "Juguetes y coleccionables",
  "Papelería y stickers",
  "Tecnología",
  "Servicios",
  "Otro",
] as const;

