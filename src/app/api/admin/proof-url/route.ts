import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ message: "Falta la ruta del archivo." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 5);

  if (error || !data) {
    return NextResponse.json({ message: "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
