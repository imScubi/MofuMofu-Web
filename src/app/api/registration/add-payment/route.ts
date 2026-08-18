import { NextResponse } from "next/server";
import { z } from "zod";
import { findRegistrationByFolio } from "@/lib/registrationLookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadedObjectExists } from "@/lib/storagePaths";
import { finalPrice } from "@/lib/discount";

export const runtime = "nodejs";

const schema = z.object({
  folio: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  additionalAmount: z.coerce.number().min(0.01),
  /** El archivo ya viajó aparte; aquí llega su ruta. */
  proofPath: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = schema.safeParse({
    folio: formData.get("folio"),
    phone: formData.get("phone"),
    additionalAmount: formData.get("additionalAmount"),
    proofPath: formData.get("proofPath"),
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

  const supabase = createAdminClient();

  // El comprobante se subió directo a Storage, así que aquí sólo se
  // confirma que exista y sea de este stand.
  const proofPath = parsed.data.proofPath;
  if (
    !(await uploadedObjectExists(
      supabase,
      "complemento",
      registration.stand_id,
      proofPath
    ))
  ) {
    return NextResponse.json(
      { message: "No encontramos tu comprobante. Vuelve a adjuntarlo." },
      { status: 400 }
    );
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
    planPrice: finalPrice(updated),
  });
}
