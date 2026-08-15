import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegistrationRow } from "@/lib/types";

/**
 * Busca un registro por su folio corto (p. ej. 1004) y confirma que el
 * teléfono coincide, para que un expositor pueda retomar su propio
 * registro (por ejemplo para completar un pago en dos partes) sin
 * necesidad de una cuenta. Devuelve null tanto si no existe el folio
 * como si el teléfono no coincide, para no revelar si un folio existe.
 */
export async function findRegistrationByFolio(
  folio: string,
  phone: string
): Promise<RegistrationRow | null> {
  const folioNumber = Number(folio.replace(/[^0-9]/g, ""));
  if (!Number.isInteger(folioNumber) || folioNumber <= 0) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("folio_number", folioNumber)
    .maybeSingle();

  if (error || !data) return null;

  const registration = data as RegistrationRow;
  const digitsOnly = phone.replace(/\D/g, "");
  const phoneMatches =
    digitsOnly.length > 0 && registration.phone.replace(/\D/g, "") === digitsOnly;

  return phoneMatches ? registration : null;
}
