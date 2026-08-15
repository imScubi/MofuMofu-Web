import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

export const MAX_PROOF_FILE_BYTES = 8 * 1024 * 1024;

export class ProofUploadError extends Error {}

/** Sube un comprobante de pago al bucket privado "payment-proofs". */
export async function uploadPaymentProof(
  supabase: ReturnType<typeof createAdminClient>,
  standId: string,
  file: File | null,
  label: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_PROOF_FILE_BYTES) {
    throw new ProofUploadError("FILE_TOO_LARGE");
  }

  const ext = file.name.split(".").pop()?.slice(0, 10) || "bin";
  const path = `${standId}/${Date.now()}-${label}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, buffer, { contentType: file.type || undefined });

  if (error) throw error;
  return path;
}
