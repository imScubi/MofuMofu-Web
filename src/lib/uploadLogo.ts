import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

export const MAX_LOGO_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class LogoUploadError extends Error {}

/**
 * Sube el logo del negocio al bucket público "business-logos".
 *
 * El bucket es público a propósito, al revés que el de comprobantes: el
 * logo se imprime en el plan logístico y se ve en el mapa, así que tiene
 * que cargar sin firmar una URL cada vez. Un logo es la marca del
 * negocio, no un dato personal.
 */
export async function uploadBusinessLogo(
  supabase: ReturnType<typeof createAdminClient>,
  standId: string,
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoUploadError("FILE_TOO_LARGE");
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new LogoUploadError("BAD_TYPE");
  }

  const ext = file.name.split(".").pop()?.slice(0, 10)?.toLowerCase() || "png";
  const path = `${standId}/${Date.now()}-logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("business-logos")
    .upload(path, buffer, { contentType: file.type || undefined });

  if (error) throw error;
  return path;
}
