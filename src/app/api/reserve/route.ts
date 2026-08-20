import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findPlanForEvent,
  occupiedStandIds,
  standRejectionReason,
} from "@/lib/zones";
import { uploadedObjectExists } from "@/lib/storagePaths";
import { eventDays } from "@/lib/eventDays";

export const runtime = "nodejs";

const schema = z.object({
  eventId: z.string().uuid(),
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
  productDetails: z.string().trim().min(1).max(300),
  participationDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  needsElectricity: z.enum(["true", "false"]),
  electricityDetails: z.string().trim().max(200).optional().or(z.literal("")),
  needsGas: z.enum(["true", "false"]),
  gasDetails: z.string().trim().max(500).optional().or(z.literal("")),
  amountReported: z.coerce.number().min(0),
  reglamentoAccepted: z.enum(["true", "false"]),
  restrictedGirosAccepted: z.enum(["true", "false"]),
  // Los archivos ya viajaron aparte; aquí llegan sus rutas.
  logoPath: z.string().trim().min(1).max(200),
  paymentProofPath: z.string().trim().min(1).max(200),
  paymentProofPath2: z.string().trim().max(200).optional().or(z.literal("")),
});

/** Cómo se llama cada campo para quien está llenando el formulario. */
const CAMPOS: Record<string, string> = {
  eventId: "la edición del evento",
  standId: "el stand",
  planId: "el plan",
  businessName: "el nombre del negocio",
  contactName: "el nombre de contacto",
  phone: "el teléfono",
  email: "el correo electrónico",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  otherSocial: "la otra red social",
  businessCategory: "el giro del negocio",
  productDetails: "qué vendes",
  participationDay: "el día que participas",
  electricityDetails: "el detalle de electricidad",
  gasDetails: "el detalle de gas",
  amountReported: "el monto que transferiste",
  logoPath: "el logo",
  paymentProofPath: "la captura de tu transferencia",
  paymentProofPath2: "la segunda captura",
};

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = schema.safeParse({
    eventId: formData.get("eventId"),
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
    productDetails: formData.get("productDetails"),
    participationDay: formData.get("participationDay") || "",
    needsElectricity: formData.get("needsElectricity"),
    electricityDetails: formData.get("electricityDetails") || "",
    needsGas: formData.get("needsGas"),
    gasDetails: formData.get("gasDetails") || "",
    amountReported: formData.get("amountReported"),
    reglamentoAccepted: formData.get("reglamentoAccepted"),
    restrictedGirosAccepted: formData.get("restrictedGirosAccepted"),
    logoPath: formData.get("logoPath"),
    paymentProofPath: formData.get("paymentProofPath"),
    paymentProofPath2: formData.get("paymentProofPath2") || "",
  });

  if (!parsed.success) {
    // El mensaje se arma aquí, con nombres en español, y no en el
    // navegador: así sirve aunque el visitante tenga cargada una
    // versión vieja de la página. "Revisa los datos del formulario" a
    // secas no le dice nada a nadie, ni a quien lo reporta.
    const campos = parsed.error.issues
      .map((issue) => CAMPOS[String(issue.path[0])] ?? String(issue.path[0]))
      .filter((campo, i, todos) => todos.indexOf(campo) === i);

    console.error("reserve validation", JSON.stringify(parsed.error.issues));

    return NextResponse.json(
      {
        message:
          campos.length > 0
            ? `Revisa ${campos.length === 1 ? "este dato" : "estos datos"}: ${campos.join(", ")}.`
            : "Revisa los datos del formulario.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  if (payload.reglamentoAccepted !== "true") {
    return NextResponse.json(
      { message: "Debes leer y aceptar el reglamento para completar tu registro." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // La edición debe existir, estar abierta, y si tiene giros restringidos
  // activados el expositor tuvo que aceptar esa cláusula.
  const { data: eventData } = await supabase
    .from("events")
    // Se pide el renglón completo porque el correo del folio necesita
    // el nombre, la sede y la fecha límite, no sólo las banderas.
    .select("*")
    .eq("id", payload.eventId)
    .maybeSingle();

  if (!eventData || !eventData.is_open) {
    return NextResponse.json(
      { message: "Esa edición del evento ya no está abierta a registros." },
      { status: 409 }
    );
  }

  // El plan se busca dentro de la edición: además de los seis de
  // siempre, puede tener planes propios (por ejemplo "Artistas").
  const plan = findPlanForEvent(eventData.extra_plans, payload.planId);
  if (!plan) {
    return NextResponse.json({ message: "Plan de stand inválido." }, { status: 400 });
  }

  // Zonas: el formulario ya filtró el mapa, pero la regla que cuenta es
  // ésta. Sin ella bastaría un POST a mano para meter un puesto de
  // comida en el pasillo de artistas.
  const { data: zonesData } = await supabase
    .from("event_zones")
    .select("*")
    .eq("event_id", payload.eventId);

  if (zonesData && zonesData.length > 0) {
    const { data: standRows } = await supabase
      .from("event_stands")
      .select("stand_id, status")
      .eq("event_id", payload.eventId);

    const rejection = standRejectionReason(
      zonesData,
      plan.id,
      payload.standId,
      occupiedStandIds(standRows ?? [])
    );
    if (rejection) {
      return NextResponse.json({ message: rejection }, { status: 409 });
    }
  }

  if (
    eventData.restricted_giros_enabled &&
    payload.restrictedGirosAccepted !== "true"
  ) {
    return NextResponse.json(
      {
        message:
          "Debes aceptar la cláusula sobre los giros restringidos para completar tu registro.",
      },
      { status: 400 }
    );
  }

  // El día elegido tiene que ser uno de la edición: si no, el plan
  // logístico acabaría con un expositor en una fecha que no existe.
  const days = eventDays(eventData.date_start, eventData.date_end);
  if (payload.participationDay && !days.includes(payload.participationDay)) {
    return NextResponse.json(
      { message: "Ese día no es parte de esta edición." },
      { status: 400 }
    );
  }
  if (!payload.participationDay && plan.days === 1 && days.length > 1) {
    return NextResponse.json(
      { message: "Elige el día en el que vas a participar." },
      { status: 400 }
    );
  }

  // Los archivos se subieron directo a Storage. El servidor no los vio
  // pasar, así que comprueba que existan y sean de este stand: si no,
  // el registro entraría sin comprobante que revisar.
  const [logoOk, proofOk] = await Promise.all([
    uploadedObjectExists(supabase, "logo", payload.standId, payload.logoPath),
    uploadedObjectExists(
      supabase,
      "comprobante",
      payload.standId,
      payload.paymentProofPath
    ),
  ]);

  if (!logoOk) {
    return NextResponse.json(
      { message: "No encontramos el logo que subiste. Vuelve a adjuntarlo." },
      { status: 400 }
    );
  }
  if (!proofOk) {
    return NextResponse.json(
      {
        message:
          "No encontramos la captura de tu transferencia. Vuelve a adjuntarla.",
      },
      { status: 400 }
    );
  }

  const logoPath = payload.logoPath;
  const proofPath = payload.paymentProofPath;

  let proofPath2: string | null = payload.paymentProofPath2 || null;
  if (
    proofPath2 &&
    !(await uploadedObjectExists(
      supabase,
      "comprobante-2",
      payload.standId,
      proofPath2
    ))
  ) {
    // El segundo comprobante es opcional: si no llegó, no vale la pena
    // tumbar el registro entero por él.
    proofPath2 = null;
  }

  const { data, error } = await supabase.rpc("reserve_stand", {
    p_event_id: payload.eventId,
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
    p_product_details: payload.productDetails,
    p_logo_path: logoPath,
    p_participation_day: payload.participationDay || null,
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
    p_reglamento_accepted: true,
    p_restricted_giros_accepted: payload.restrictedGirosAccepted === "true",
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
      {
        message: "No pudimos completar tu registro. Intenta de nuevo.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
