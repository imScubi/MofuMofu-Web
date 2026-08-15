import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICING_PLANS } from "@/lib/eventConfig";
import { ProofUploadError, uploadPaymentProof } from "@/lib/uploadPaymentProof";

export const runtime = "nodejs";

const schema = z.object({
  standId: z.string().min(1),
  planId: z.string().min(1),
  businessName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  instagram: z.string().trim().max(200).optional().or(z.literal("")),
  facebook: z.string().trim().max(200).optional().or(z.literal("")),
  tiktok: z.string().trim().max(200).optional().or(z.literal("")),
  otherSocial: z.string().trim().max(200).optional().or(z.literal("")),
  businessCategory: z.string().trim().min(1).max(100),
  needsElectricity: z.enum(["true", "false"]),
  electricityDetails: z.string().trim().max(200).optional().or(z.literal("")),
  needsGas: z.enum(["true", "false"]),
  gasDetails: z.string().trim().max(500).optional().or(z.literal("")),
  amountReported: z.coerce.number().min(0),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = schema.safeParse({
    standId: formData.get("standId"),
    planId: formData.get("planId"),
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    instagram: formData.get("instagram") || "",
    facebook: formData.get("facebook") || "",
    tiktok: formData.get("tiktok") || "",
    otherSocial: formData.get("otherSocial") || "",
    businessCategory: formData.get("businessCategory"),
    needsElectricity: formData.get("needsElectricity"),
    electricityDetails: formData.get("electricityDetails") || "",
    needsGas: formData.get("needsGas"),
    gasDetails: formData.get("gasDetails") || "",
    amountReported: formData.get("amountReported"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos del formulario.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const plan = PRICING_PLANS.find((p) => p.id === payload.planId);
  if (!plan) {
    return NextResponse.json({ message: "Plan de stand inválido." }, { status: 400 });
  }

  const supabase = createAdminClient();

  let proofPath: string | null;
  let proofPath2: string | null;
  try {
    proofPath = await uploadPaymentProof(
      supabase,
      payload.standId,
      formData.get("paymentProof") as File | null,
      "comprobante"
    );
    proofPath2 = await uploadPaymentProof(
      supabase,
      payload.standId,
      formData.get("paymentProof2") as File | null,
      "comprobante-2"
    );
  } catch (err) {
    const message =
      err instanceof ProofUploadError
        ? "El archivo del comprobante es demasiado grande (máx. 8MB)."
        : "No pudimos subir tu comprobante de pago. Intenta de nuevo.";
    return NextResponse.json({ message }, { status: 400 });
  }

  if (!proofPath) {
    return NextResponse.json(
      { message: "Debes adjuntar la captura de tu transferencia." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("reserve_stand", {
    p_stand_id: payload.standId,
    p_business_name: payload.businessName,
    p_contact_name: payload.contactName,
    p_phone: payload.phone,
    p_email: payload.email || null,
    p_instagram: payload.instagram || null,
    p_facebook: payload.facebook || null,
    p_tiktok: payload.tiktok || null,
    p_other_social: payload.otherSocial || null,
    p_business_category: payload.businessCategory,
    p_needs_electricity: payload.needsElectricity === "true",
    p_electricity_details: payload.electricityDetails || null,
    p_needs_gas: payload.needsGas === "true",
    p_gas_details: payload.gasDetails || null,
    p_amount_reported: payload.amountReported,
    p_payment_proof_path: proofPath,
    p_payment_proof_path_2: proofPath2,
    p_plan_id: plan.id,
    p_plan_label: `${plan.categoryLabel} · ${plan.days} ${plan.days === 1 ? "día" : "días"}`,
    p_plan_price: plan.price,
    p_is_shared: plan.shared,
  });

  if (error) {
    if (error.message.includes("STAND_UNAVAILABLE")) {
      return NextResponse.json(
        { code: "STAND_UNAVAILABLE", message: "Ese stand ya no está disponible." },
        { status: 409 }
      );
    }
    console.error("reserve_stand error", error);
    return NextResponse.json(
      { message: "No pudimos completar tu registro. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
