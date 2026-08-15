import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegistrationRow } from "@/lib/types";

/**
 * Busca un registro por folio (id) y confirma que el teléfono coincide,
 * para que un expositor pueda retomar su propio registro (por ejemplo
 * para completar un pago en dos partes) sin necesidad de una cuenta.
 * Devuelve null tanto si no existe el folio como si el teléfono no
 * coincide, para no revelar si un folio existe o no.
 */
export async function findRegistrationByFolio(
  folio: string,
  phone: string
): Promise<RegistrationRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", folio)
    .maybeSingle();

  if (error || !data) return null;

  const registration = data as RegistrationRow;
  const phoneMatches =
    registration.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") &&
    phone.replace(/\D/g, "").length > 0;

  return phoneMatches ? registration : null;
}
