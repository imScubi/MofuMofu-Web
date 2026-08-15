import { NextResponse } from "next/server";
import { z } from "zod";
import { findRegistrationByFolio } from "@/lib/registrationLookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProofUploadError, uploadPaymentProof } from "@/lib/uploadPaymentProof";

export const runtime = "nodejs";

const schema = z.object({
  folio: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  additionalAmount: z.coerce.number().min(0.01),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = schema.safeParse({
    folio: formData.get("folio"),
    phone: formData.get("phone"),
    additionalAmount: formData.get("additionalAmount"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa el folio, teléfono y monto." },
      { status: 400 }
    );
  }

  const registration = await findRegistrationByFolio(parsed.data.folio, parsed.data.phone);
  if (!registration) {
    return NextResponse.json(
      {
        message:
          "No encontramos ese registro. Revisa que el folio y el teléfono sean exactamente los que usaste al registrarte.",
      },
      { status: 404 }
    );
  }

  if (registration.status === "rejected") {
    return NextResponse.json(
      {
        message:
          "Este registro fue rechazado, así que ya no está apartado. Contacta a los organizadores.",
      },
      { status: 409 }
    );
  }

  const proofFile = formData.get("proof") as File | null;
  if (!proofFile || proofFile.size === 0) {
    return NextResponse.json(
      { message: "Adjunta la captura de tu segunda transferencia." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  let proofPath: string | null;
  try {
    proofPath = await uploadPaymentProof(
      supabase,
      registration.stand_id,
      proofFile,
      "complemento"
    );
  } catch (err) {
    const message =
      err instanceof ProofUploadError
        ? "El archivo del comprobante es demasiado grande (máx. 8MB)."
        : "No pudimos subir tu comprobante de pago. Intenta de nuevo.";
    return NextResponse.json({ message }, { status: 400 });
  }

  const newAmount = Number(registration.amount_reported) + parsed.data.additionalAmount;

  const { data: updated, error } = await supabase
    .from("registrations")
    .update({
      amount_reported: newAmount,
      payment_proof_path_2: proofPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registration.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { message: "No pudimos actualizar tu registro. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    folioNumber: updated.folio_number,
    amountReported: Number(updated.amount_reported),
    planPrice: Number(updated.plan_price),
  });
}
