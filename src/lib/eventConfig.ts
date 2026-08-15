// Configuración general del evento — edita estos valores para tu evento.
export const EVENT_CONFIG = {
  name: "MofuMofu Market",
  tagline: "Registro de expositores",
  // Fecha del evento, usada para la proyección de cobros en el Excel.
  eventDate: "2026-11-14",
  // Fecha límite para liquidar el pago del stand.
  paymentDeadline: "2026-10-31",
  currency: "MXN",
  // Datos bancarios a mostrar al expositor para hacer su transferencia.
  // TODO: reemplaza esto con los datos reales de tu cuenta.
  bankInfo: {
    bank: "Nombre del banco",
    accountHolder: "Nombre del titular",
    clabe: "0000 0000 0000 0000 00",
    accountNumber: "0000000000",
    concept: "Nombre de tu negocio + número de stand",
  },
  contactEmail: "hola@mofumofumarket.com",
  contactWhatsapp: "",
} as const;

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

