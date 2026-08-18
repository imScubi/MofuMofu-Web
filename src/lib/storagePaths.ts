import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Los archivos del registro se suben directo a Storage desde el
 * navegador, no dentro del POST del formulario.
 *
 * El motivo es un techo de la plataforma: una función serverless de
 * Vercel rechaza cualquier petición de más de 4.5 MB antes de que
 * nuestro código llegue a verla, y el registro mandaba logo más dos
 * comprobantes en el mismo envío. Subiendo aparte, el formulario viaja
 * con puro texto y los archivos no tienen ese límite.
 *
 * A cambio, el servidor ya no ve los archivos pasar: por eso arma él
 * las rutas (el cliente nunca elige dónde escribe) y al reservar
 * comprueba que lo que le nombran exista de verdad y sea de ese stand.
 */

export const UPLOAD_KINDS = {
  logo: { bucket: "business-logos", label: "logo" },
  comprobante: { bucket: "payment-proofs", label: "comprobante" },
  "comprobante-2": { bucket: "payment-proofs", label: "comprobante-2" },
  complemento: { bucket: "payment-proofs", label: "complemento" },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && value in UPLOAD_KINDS;
}

/** Una extensión de archivo domesticada: sin puntos, barras ni sorpresas. */
export function safeExtension(name: string, fallback: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,10}$/.test(ext) ? ext : fallback;
}

export function buildUploadPath(
  kind: UploadKind,
  standId: string,
  extension: string
): string {
  return `${standId}/${Date.now()}-${UPLOAD_KINDS[kind].label}.${extension}`;
}

/**
 * Lee una ruta que decimos haber emitido. Devuelve null si no tiene
 * exactamente la forma que armamos nosotros — así una ruta inventada no
 * llega siquiera a consultarse contra Storage.
 */
export function parseUploadPath(
  path: string
): { kind: UploadKind; standId: string } | null {
  const match = path.match(
    /^([A-Za-z0-9-]{1,12})\/(\d{13})-(logo|comprobante-2|comprobante|complemento)\.[a-z0-9]{1,10}$/
  );
  if (!match) return null;

  const [, standId, , label] = match;
  const kind = (Object.keys(UPLOAD_KINDS) as UploadKind[]).find(
    (k) => UPLOAD_KINDS[k].label === label
  );
  return kind ? { kind, standId } : null;
}

/**
 * ¿Existe ese archivo y es del stand que dice? Sin esta comprobación,
 * cualquiera podría registrarse nombrando una ruta que nunca subió y
 * quedarse sin comprobante que revisar.
 */
export async function uploadedObjectExists(
  supabase: ReturnType<typeof createAdminClient>,
  kind: UploadKind,
  standId: string,
  path: string
): Promise<boolean> {
  const parsed = parseUploadPath(path);
  if (!parsed || parsed.kind !== kind || parsed.standId !== standId) return false;

  const slash = path.indexOf("/");
  const { data, error } = await supabase.storage
    .from(UPLOAD_KINDS[kind].bucket)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

  return !error && (data?.length ?? 0) > 0;
}
