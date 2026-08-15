import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import type { RegistrationRow, StandRow } from "@/lib/types";

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

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [{ data: standsData }, { data: registrationsData }] = await Promise.all([
    supabase.from("stands").select("*").order("id"),
    supabase.from("registrations").select("*").order("created_at"),
  ]);

  const stands = (standsData as StandRow[]) ?? [];
  const registrations = (registrationsData as RegistrationRow[]) ?? [];
  const reservableStands = stands.filter((s) => s.reservable);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = EVENT_CONFIG.name;
  workbook.created = new Date();

  // ---------------------------------------------------------------
  // Hoja "Stands"
  // ---------------------------------------------------------------
  const standsSheet = workbook.addWorksheet("Stands");
  standsSheet.columns = [
    { header: "Stand", key: "id", width: 10 },
    { header: "Precio", key: "price", width: 14 },
    { header: "Estatus", key: "status", width: 16 },
  ];
  standsSheet.getRow(1).font = { bold: true };

  reservableStands.forEach((s) => {
    const rowValues = standsSheet.addRow({
      id: s.id,
      price: Number(s.price),
      status: STAND_STATUS_LABEL[s.status] ?? s.status,
    });
    rowValues.getCell("price").numFmt = MONEY_FORMAT;
  });
  const standsLastRow = reservableStands.length + 1;

  // ---------------------------------------------------------------
  // Hoja "Registros"
  // ---------------------------------------------------------------
  const regSheet = workbook.addWorksheet("Registros");
  regSheet.columns = [
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
    { header: "Precio stand", key: "price", width: 14 },
    { header: "Monto reportado", key: "amount", width: 16 },
    { header: "Saldo pendiente", key: "balance", width: 16 },
    { header: "Estatus", key: "status", width: 14 },
    { header: "Notas admin", key: "notes", width: 24 },
    { header: "Fecha de registro", key: "createdAt", width: 18 },
  ];
  regSheet.getRow(1).font = { bold: true };

  registrations.forEach((r) => {
    const stand = stands.find((s) => s.id === r.stand_id);
    const price = Number(stand?.price ?? 0);
    const rowNumber = regSheet.rowCount + 1;

    const row = regSheet.addRow({
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
      price,
      amount: Number(r.amount_reported),
      balance: { formula: `N${rowNumber}-O${rowNumber}` },
      status: REG_STATUS_LABEL[r.status] ?? r.status,
      notes: r.admin_notes ?? "",
      createdAt: new Date(r.created_at),
    });

    row.getCell("price").numFmt = MONEY_FORMAT;
    row.getCell("amount").numFmt = MONEY_FORMAT;
    row.getCell("balance").numFmt = MONEY_FORMAT;
    row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  });

  const regLastRow = registrations.length + 1;
  const amountRange = `Registros!O2:O${Math.max(regLastRow, 2)}`;
  const statusRange = `Registros!Q2:Q${Math.max(regLastRow, 2)}`;

  // ---------------------------------------------------------------
  // Hoja "Resumen" — fórmulas en vivo sobre las hojas anteriores
  // ---------------------------------------------------------------
  const summary = workbook.addWorksheet("Resumen");
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 20;

  let r = 1;
  summary.getCell(`A${r}`).value = EVENT_CONFIG.name;
  summary.getCell(`A${r}`).font = { bold: true, size: 14 };
  r += 2;

  summary.getCell(`A${r}`).value = "Resumen de stands";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;
  const statRows: [string, string][] = [
    ["Total de stands", `COUNTA(Stands!A2:A${standsLastRow})`],
    ["Disponibles", `COUNTIF(Stands!C2:C${standsLastRow},"Disponible")`],
    ["En proceso de pago", `COUNTIF(Stands!C2:C${standsLastRow},"En proceso")`],
    ["Apartados", `COUNTIF(Stands!C2:C${standsLastRow},"Apartado")`],
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
  summary.getCell(`A${r}`).value = "Ingreso esperado (stands apartados + en proceso)";
  summary.getCell(`B${r}`).value = {
    formula: `SUMIF(Stands!C2:C${standsLastRow},"Apartado",Stands!B2:B${standsLastRow})+SUMIF(Stands!C2:C${standsLastRow},"En proceso",Stands!B2:B${standsLastRow})`,
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

  summary.getCell(`A${r}`).value = "Proyección";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  const deadline = new Date(EVENT_CONFIG.paymentDeadline + "T00:00:00");
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
  const filename = `expositores-${EVENT_CONFIG.name.replace(/\s+/g, "-").toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
