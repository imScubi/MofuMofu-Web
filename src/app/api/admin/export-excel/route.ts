import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_CONFIG, PRICING_PLANS } from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import type { EventRow, EventStandRow, RegistrationRow } from "@/lib/types";

export const runtime = "nodejs";

const REG_STATUS_LABEL: Record<string, string> = {
  pending_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STAND_STATUS_LABEL: Record<string, string> = {
  available: "Disponible",
  pending: "En proceso",
  sold: "Apartado",
  blocked: "No disponible",
};

const MONEY_FORMAT = '"$"#,##0.00';

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Cada edición del evento se exporta a su propio Excel.
  const requestedEventId = new URL(request.url).searchParams.get("event");
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .order("date_start");
  const events = (eventsData as EventRow[]) ?? [];
  const event =
    events.find((e) => e.id === requestedEventId) ??
    events.find((e) => e.is_open) ??
    events[0];

  if (!event) {
    return NextResponse.json(
      { message: "Todavía no hay ediciones del evento." },
      { status: 404 }
    );
  }

  const [{ data: standsData }, { data: registrationsData }] = await Promise.all([
    supabase.from("event_stands").select("*").eq("event_id", event.id).order("stand_id"),
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at"),
  ]);

  const reservableStands = (standsData as EventStandRow[]) ?? [];
  const registrations = (registrationsData as RegistrationRow[]) ?? [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = EVENT_CONFIG.name;
  workbook.created = new Date();

  // ---------------------------------------------------------------
  // Hoja "Stands"
  // ---------------------------------------------------------------
  const standsSheet = workbook.addWorksheet("Stands");
  standsSheet.columns = [
    { header: "Stand", key: "id", width: 10 },
    { header: "Estatus", key: "status", width: 16 },
  ];
  standsSheet.getRow(1).font = { bold: true };

  reservableStands.forEach((s) => {
    standsSheet.addRow({
      id: s.stand_id,
      status: STAND_STATUS_LABEL[s.status] ?? s.status,
    });
  });
  const standsLastRow = reservableStands.length + 1;

  // ---------------------------------------------------------------
  // Hoja "Registros"
  // ---------------------------------------------------------------
  const regSheet = workbook.addWorksheet("Registros");
  regSheet.columns = [
    { header: "Folio", key: "folio", width: 9 },
    { header: "Stand", key: "stand", width: 8 },
    { header: "Negocio", key: "business", width: 24 },
    { header: "Contacto", key: "contact", width: 20 },
    { header: "Teléfono", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Instagram", key: "instagram", width: 18 },
    { header: "Facebook", key: "facebook", width: 18 },
    { header: "TikTok", key: "tiktok", width: 18 },
    { header: "Giro del negocio", key: "category", width: 20 },
    { header: "Electricidad", key: "electricity", width: 14 },
    { header: "Detalle electricidad", key: "electricityDetails", width: 24 },
    { header: "Gas", key: "gas", width: 10 },
    { header: "Detalle gas", key: "gasDetails", width: 24 },
    { header: "Plan", key: "plan", width: 24 },
    { header: "Compartido", key: "shared", width: 12 },
    { header: "Precio del plan", key: "planPrice", width: 16 },
    { header: "Monto reportado", key: "amount", width: 16 },
    { header: "Saldo pendiente", key: "balance", width: 16 },
    { header: "Estatus", key: "status", width: 14 },
    { header: "Reglamento aceptado", key: "reglamento", width: 20 },
    { header: "Giros restringidos aceptados", key: "giros", width: 26 },
    { header: "Notas admin", key: "notes", width: 24 },
    { header: "Fecha de registro", key: "createdAt", width: 18 },
  ];
  regSheet.getRow(1).font = { bold: true };

  registrations.forEach((r) => {
    const rowNumber = regSheet.rowCount + 1;

    const row = regSheet.addRow({
      folio: r.folio_number,
      stand: r.stand_id,
      business: r.business_name,
      contact: r.contact_name,
      phone: r.phone,
      email: r.email ?? "",
      instagram: r.instagram ?? "",
      facebook: r.facebook ?? "",
      tiktok: r.tiktok ?? "",
      category: r.business_category,
      electricity: r.needs_electricity ? "Sí" : "No",
      electricityDetails: r.electricity_details ?? "",
      gas: r.needs_gas ? "Sí" : "No",
      gasDetails: r.gas_details ?? "",
      plan: r.plan_label,
      shared: r.is_shared ? "Sí" : "No",
      planPrice: Number(r.plan_price),
      amount: Number(r.amount_reported),
      balance: { formula: `Q${rowNumber}-R${rowNumber}` },
      status: REG_STATUS_LABEL[r.status] ?? r.status,
      reglamento: r.reglamento_accepted ? "Sí" : "No",
      giros: r.restricted_giros_accepted ? "Sí" : "No",
      notes: r.admin_notes ?? "",
      createdAt: new Date(r.created_at),
    });

    row.getCell("planPrice").numFmt = MONEY_FORMAT;
    row.getCell("amount").numFmt = MONEY_FORMAT;
    row.getCell("balance").numFmt = MONEY_FORMAT;
    row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  });

  // Columnas de la hoja "Registros": O = Plan, Q = Precio del plan,
  // R = Monto reportado, T = Estatus.
  const regLastRow = registrations.length + 1;
  const planRange = `Registros!O2:O${Math.max(regLastRow, 2)}`;
  const planPriceRange = `Registros!Q2:Q${Math.max(regLastRow, 2)}`;
  const amountRange = `Registros!R2:R${Math.max(regLastRow, 2)}`;
  const statusRange = `Registros!T2:T${Math.max(regLastRow, 2)}`;

  // ---------------------------------------------------------------
  // Hoja "Resumen" — fórmulas en vivo sobre las hojas anteriores
  // ---------------------------------------------------------------
  const summary = workbook.addWorksheet("Resumen");
  summary.getColumn(1).width = 34;
  summary.getColumn(2).width = 20;

  let r = 1;
  summary.getCell(`A${r}`).value = `${EVENT_CONFIG.name} — ${event.name}`;
  summary.getCell(`A${r}`).font = { bold: true, size: 14 };
  r++;
  summary.getCell(`A${r}`).value = formatEventDates(event.date_start, event.date_end);
  summary.getCell(`A${r}`).font = { size: 11 };
  r += 2;

  summary.getCell(`A${r}`).value = "Resumen de stands";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;
  const statRows: [string, string][] = [
    ["Total de stands", `COUNTA(Stands!A2:A${standsLastRow})`],
    ["Disponibles", `COUNTIF(Stands!B2:B${standsLastRow},"Disponible")`],
    ["En proceso de pago", `COUNTIF(Stands!B2:B${standsLastRow},"En proceso")`],
    ["Apartados", `COUNTIF(Stands!B2:B${standsLastRow},"Apartado")`],
  ];
  statRows.forEach(([label, formula]) => {
    summary.getCell(`A${r}`).value = label;
    summary.getCell(`B${r}`).value = { formula };
    r++;
  });

  r++;
  summary.getCell(`A${r}`).value = "Resumen financiero";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  const expectedRow = r;
  summary.getCell(`A${r}`).value = "Ingreso esperado (planes de registros no rechazados)";
  summary.getCell(`B${r}`).value = {
    formula: `SUMIFS(${planPriceRange},${statusRange},"<>Rechazado")`,
  };
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  const collectedRow = r;
  summary.getCell(`A${r}`).value = "Recaudado (montos reportados, sin rechazados)";
  summary.getCell(`B${r}`).value = {
    formula: `SUMIFS(${amountRange},${statusRange},"<>Rechazado")`,
  };
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  summary.getCell(`A${r}`).value = "Recaudado de registros aprobados";
  summary.getCell(`B${r}`).value = {
    formula: `SUMIFS(${amountRange},${statusRange},"Aprobado")`,
  };
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  const balanceRow = r;
  summary.getCell(`A${r}`).value = "Saldo pendiente de cobro";
  summary.getCell(`B${r}`).value = {
    formula: `B${expectedRow}-B${collectedRow}`,
  };
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  summary.getCell(`B${r}`).font = { bold: true };
  r += 2;

  summary.getCell(`A${r}`).value = "Desglose por plan (registros no rechazados)";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  const planLabels = Array.from(
    new Map(
      PRICING_PLANS.map((p) => [
        `${p.categoryLabel} · ${p.days} ${p.days === 1 ? "día" : "días"}`,
        true,
      ])
    ).keys()
  );
  planLabels.forEach((label) => {
    summary.getCell(`A${r}`).value = label;
    summary.getCell(`B${r}`).value = {
      formula: `SUMIFS(${planPriceRange},${planRange},"${label}",${statusRange},"<>Rechazado")`,
    };
    summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
    r++;
  });
  r++;

  summary.getCell(`A${r}`).value = "Proyección";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  const deadline = new Date(event.payment_deadline + "T00:00:00");
  summary.getCell(`A${r}`).value = "Fecha límite de pago";
  summary.getCell(`B${r}`).value = deadline;
  summary.getCell(`B${r}`).numFmt = "dd/mm/yyyy";
  const deadlineRow = r;
  r++;

  summary.getCell(`A${r}`).value = "Días restantes";
  summary.getCell(`B${r}`).value = { formula: `B${deadlineRow}-TODAY()` };
  const daysLeftRow = r;
  r++;

  summary.getCell(`A${r}`).value = "Cobro sugerido por día para liquidar a tiempo";
  summary.getCell(`B${r}`).value = {
    formula: `IF(B${daysLeftRow}>0,B${balanceRow}/B${daysLeftRow},B${balanceRow})`,
  };
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;

  summary.getCell(`A1`).alignment = { vertical: "middle" };

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = event.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const filename = `expositores-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
