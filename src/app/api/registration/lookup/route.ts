import { NextResponse } from "next/server";
import { z } from "zod";
import { findRegistrationByFolio } from "@/lib/registrationLookup";
import { finalPrice } from "@/lib/discount";

export const runtime = "nodejs";

const schema = z.object({
  folio: z.string().trim().min(1),
  phone: z.string().trim().min(6),
});

const NOT_FOUND_MESSAGE =
  "No encontramos ese registro. Revisa que el folio y el teléfono sean exactamente los que usaste al registrarte.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Ingresa tu folio y teléfono." }, { status: 400 });
  }

  const registration = await findRegistrationByFolio(parsed.data.folio, parsed.data.phone);

  if (!registration) {
    return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
  }

  return NextResponse.json({
    folioNumber: registration.folio_number,
    standId: registration.stand_id,
    businessName: registration.business_name,
    planLabel: registration.plan_label,
    // Lo que le toca pagar, ya con el descuento si el organizador se
    // lo aplicó: pedirle el precio de lista sería cobrarle de más.
    planPrice: finalPrice(registration),
    amountReported: Number(registration.amount_reported),
    status: registration.status,
  });
}
