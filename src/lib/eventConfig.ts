// Configuración general del evento — edita estos valores para tu evento.
export const EVENT_CONFIG = {
  name: "MofuMofu Market",
  tagline: "Registro de expositores",
  // Fecha del evento, usada para la proyección de cobros en el Excel.
  eventDate: "2026-11-14",
  // Fecha límite para liquidar el pago del stand.
  paymentDeadline: "2026-10-31",
  // Precio por defecto de un stand (MXN). Se puede ajustar por stand desde el panel admin.
  defaultStandPrice: 2500,
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

