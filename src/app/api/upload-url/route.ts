import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  UPLOAD_KINDS,
  buildUploadPath,
  isUploadKind,
  safeExtension,
} from "@/lib/storagePaths";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.string().refine(isUploadKind, "Tipo de archivo desconocido."),
  // El stand sólo se usa para ordenar los archivos en carpetas; que
  // todavía no esté apartado es normal, el registro va después.
  standId: z.string().trim().regex(/^[A-Za-z0-9-]{1,12}$/),
  fileName: z.string().trim().max(200),
});

/**
 * Entrega un permiso de subida de un solo uso para un archivo del
 * registro. La ruta la arma el servidor, así que el permiso vale para
 * ese archivo y para ninguno más.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Petición inválida." }, { status: 400 });
  }

  const { kind, standId, fileName } = parsed.data;
  if (!isUploadKind(kind)) {
    return NextResponse.json({ message: "Petición inválida." }, { status: 400 });
  }

  const bucket = UPLOAD_KINDS[kind].bucket;
  const path = buildUploadPath(
    kind,
    standId,
    safeExtension(fileName, kind === "logo" ? "png" : "jpg")
  );

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("signed upload url error", error);
    return NextResponse.json(
      { message: "No pudimos preparar la subida del archivo. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ bucket, path, token: data.token });
}
