import type { RegistrationRow } from "@/lib/types";

/**
 * Descuentos internos.
 *
 * El precio del plan no se toca: se guarda aparte cuánto se decidió
 * descontar. Así el Excel puede mostrar las tres cifras —lo que vale,
 * lo que se perdonó y lo que se va a cobrar— en vez de un precio
 * rebajado que esconde la diferencia.
 */

export interface DiscountInput {
  plan_price: number | string;
  discount_type: "percent" | "amount" | null;
  discount_value: number | string;
}

/** Cuánto se descuenta, en pesos. Nunca más que el precio del plan. */
export function discountAmount(registration: DiscountInput): number {
  const price = Number(registration.plan_price) || 0;
  const value = Number(registration.discount_value) || 0;
  if (!registration.discount_type || value <= 0) return 0;

  const raw =
    registration.discount_type === "percent" ? (price * value) / 100 : value;

  // Un descuento mayor al precio dejaría un total negativo, que en un
  // corte de caja se lee como si el evento le debiera al expositor.
  return Math.min(Math.round(raw * 100) / 100, price);
}

/** Lo que realmente hay que cobrarle. */
export function finalPrice(registration: DiscountInput): number {
  const price = Number(registration.plan_price) || 0;
  return Math.round((price - discountAmount(registration)) * 100) / 100;
}

/** "5%" o "$100", para mostrarlo sin repetir la cuenta. */
export function describeDiscount(registration: DiscountInput): string {
  const value = Number(registration.discount_value) || 0;
  if (!registration.discount_type || value <= 0) return "";
  return registration.discount_type === "percent"
    ? `${value}%`
    : `$${value.toLocaleString("es-MX")}`;
}

/** Lo que falta por cobrar después del descuento. */
export function balanceDue(registration: RegistrationRow): number {
  return Math.max(
    finalPrice(registration) - (Number(registration.amount_reported) || 0),
    0
  );
}
