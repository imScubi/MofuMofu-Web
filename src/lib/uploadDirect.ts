"use client";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import type { UploadKind } from "@/lib/storagePaths";

export class DirectUploadError extends Error {}

/**
 * Topes por tipo de archivo. Coinciden con los que impone el bucket en
 * Supabase: si sólo estuvieran allá, el expositor vería un error del
 * almacén después de esperar toda la subida.
 */
const MAX_BYTES: Record<UploadKind, number> = {
  logo: 4 * 1024 * 1024,
  comprobante: 12 * 1024 * 1024,
  "comprobante-2": 12 * 1024 * 1024,
  complemento: 12 * 1024 * 1024,
};

/**
 * Sube un archivo del registro directo a Storage y devuelve su ruta.
 *
 * Antes iba dentro del POST del formulario, hasta que un expositor se
 * topó con "413 Request Entity Too Large": la plataforma corta las
 * peticiones de más de 4.5 MB antes de que el servidor las vea, y logo
 * más dos comprobantes pasaban de eso con facilidad. Ahora el
 * formulario manda sólo la ruta.
 */
export async function uploadDirect(
  kind: UploadKind,
  standId: string,
  original: File
): Promise<string> {
  // Achicar primero: una foto de comprobante de 6 MB baja a menos de
  // uno sin perder nada legible, y sube mucho más rápido con datos.
  const file = await compressImage(original, { keepAlpha: kind === "logo" });

  const max = MAX_BYTES[kind];
  if (file.size > max) {
    throw new DirectUploadError(
      `El archivo pesa demasiado (máx. ${Math.round(max / (1024 * 1024))}MB). Súbelo más ligero.`
    );
  }

  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, standId, fileName: file.name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new DirectUploadError(
      data.message || "No pudimos preparar la subida del archivo."
    );
  }

  const { bucket, path, token } = (await res.json()) as {
    bucket: string;
    path: string;
    token: string;
  };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });

  if (error) {
    throw new DirectUploadError(
      "No pudimos subir el archivo. Revisa tu conexión e intenta de nuevo."
    );
  }

  return path;
}
