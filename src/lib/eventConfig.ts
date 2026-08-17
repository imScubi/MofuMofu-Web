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
    facebook: "",
    tiktok: "",
  },
} as const;

// Dónde se hace el evento.
//
// LLENA ESTO: mientras "city" esté vacío, la web no le puede decir a
// Google en qué ciudad es, y una búsqueda como "bazar kawaii en <tu
// ciudad>" no la va a encontrar. Con estos datos aparece además la
// ficha del evento con lugar y fechas en los resultados.
interface Venue {
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  mapsUrl: string;
}

export const VENUE: Venue = {
  /** Nombre del parque o recinto. Ej. "Parque Fundidora". */
  name: "",
  /** Calle y número, si aplica. */
  street: "",
  /** Ej. "Monterrey". */
  city: "",
  /** Ej. "Nuevo León". */
  state: "",
  country: "México",
  /** Link de Google Maps del lugar, opcional. */
  mapsUrl: "",
};

/** "Parque Fundidora, Monterrey, Nuevo León" con lo que esté lleno. */
export function venueLine(): string {
  return [VENUE.name, VENUE.city, VENUE.state].filter(Boolean).join(", ");
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

