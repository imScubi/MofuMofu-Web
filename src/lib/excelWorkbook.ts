import ExcelJS from "exceljs";
import { EVENT_CONFIG, PRICING_PLANS } from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import { getContestType } from "@/lib/contestTypes";
import type {
  ContestEntryRow,
  ContestRow,
  EventRow,
  EventStandRow,
  RegistrationRow,
} from "@/lib/types";

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

const ENTRY_STATUS_LABEL: Record<string, string> = {
  pending_review: "En revisión",
  approved: "Aceptado",
  rejected: "Rechazado",
};

/**
 * Excel no acepta nombres de hoja de más de 31 caracteres, con los
 * signos : \\ / ? * [ ], ni repetidos. Una convocatoria puede llamarse
 * como sea, así que hay que domar el nombre antes de usarlo.
 */
function safeSheetName(name: string, used: Set<string>): string {
  const base =
    name
      .replace(/[:\\/?*[\]']/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || "Convocatoria";

  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export interface EventWorkbookData {
  event: EventRow;
  reservableStands: EventStandRow[];
  registrations: RegistrationRow[];
  contests: ContestRow[];
  contestEntries: ContestEntryRow[];
}

/**
 * Arma el libro de una edición: stands, registros de expositores, una
 * hoja por convocatoria y un resumen con fórmulas vivas.
 *
 * Vive aparte de la ruta HTTP a propósito: las fórmulas del resumen
 * apuntan a celdas de otras hojas, y un error ahí no se nota hasta que
 * alguien abre el archivo. Separado se puede ejercitar sin servidor.
 */
export async function buildEventWorkbook({
  event,
  reservableStands,
  registrations,
  contests,
  contestEntries,
}: EventWorkbookData): Promise<ExcelJS.Workbook> {
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
    { header: "Qué vende", key: "products", width: 34 },
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

  // Las letras se derivan de las columnas: escribirlas a mano hace que
  // agregar una columna rompa en silencio todas las fórmulas del resumen.
  const col = (key: string) => regSheet.getColumn(key).letter;

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
      products: r.product_details ?? "",
      electricity: r.needs_electricity ? "Sí" : "No",
      electricityDetails: r.electricity_details ?? "",
      gas: r.needs_gas ? "Sí" : "No",
      gasDetails: r.gas_details ?? "",
      plan: r.plan_label,
      shared: r.is_shared ? "Sí" : "No",
      planPrice: Number(r.plan_price),
      amount: Number(r.amount_reported),
      balance: {
        formula: `${col("planPrice")}${rowNumber}-${col("amount")}${rowNumber}`,
      },
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

  const regLastRow = Math.max(registrations.length + 1, 2);
  const range = (key: string) =>
    `Registros!${col(key)}2:${col(key)}${regLastRow}`;
  const planRange = range("plan");
  const planPriceRange = range("planPrice");
  const amountRange = range("amount");
  const statusRange = range("status");

  // ---------------------------------------------------------------
  // Una hoja por convocatoria (dance cover, cosplay, TCG...)
  //
  // Las columnas salen del tipo de cada convocatoria, así que cada hoja
  // trae exactamente las preguntas que ese concurso hizo y ninguna más.
  // ---------------------------------------------------------------
  const usedSheetNames = new Set(["stands", "registros", "resumen"]);
  const contestSheets = contests.map((contest) => {
    const type = getContestType(contest.type);
    const sheetName = safeSheetName(contest.name, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: "Folio", key: "folio", width: 9 },
      { header: type.nameLabel, key: "participant", width: 28 },
      { header: "Teléfono", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 24 },
      ...type.fields.map((field) => ({
        header: field.label,
        key: `answer_${field.id}`,
        width: field.type === "textarea" ? 34 : 22,
      })),
      { header: "Estatus", key: "status", width: 14 },
      { header: "Notas admin", key: "notes", width: 24 },
      { header: "Fecha de inscripción", key: "createdAt", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    const rows = contestEntries.filter((e) => e.contest_id === contest.id);
    rows.forEach((entry) => {
      const answers: Record<string, string> = {};
      for (const field of type.fields) {
        answers[`answer_${field.id}`] = entry.answers?.[field.id] ?? "";
      }
      const row = sheet.addRow({
        folio: entry.folio_number,
        participant: entry.participant_name,
        phone: entry.phone,
        email: entry.email ?? "",
        ...answers,
        status: ENTRY_STATUS_LABEL[entry.status] ?? entry.status,
        notes: entry.admin_notes ?? "",
        createdAt: new Date(entry.created_at),
      });
      row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
    });

    return {
      contest,
      sheetName,
      lastRow: Math.max(rows.length + 1, 2),
      folioLetter: sheet.getColumn("folio").letter,
      statusLetter: sheet.getColumn("status").letter,
    };
  });

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

  // ---------------------------------------------------------------
  // Convocatorias: cupos e inscritos, con fórmulas sobre cada hoja para
  // que al borrar o agregar filas los números se corrijan solos.
  // ---------------------------------------------------------------
  if (contestSheets.length > 0) {
    r += 2;
    summary.getCell(`A${r}`).value = "Convocatorias";
    summary.getCell(`A${r}`).font = { bold: true };
    r++;

    ["Convocatoria", "Inscritos", "Cupo", "Lugares libres", "Aceptados"].forEach(
      (header, i) => {
        const cell = summary.getCell(r, i + 1);
        cell.value = header;
        cell.font = { bold: true };
      }
    );
    summary.getColumn(3).width = 14;
    summary.getColumn(4).width = 16;
    summary.getColumn(5).width = 14;
    r++;

    contestSheets.forEach(({ contest, sheetName, lastRow, folioLetter, statusLetter }) => {
      const folioRange = `'${sheetName}'!${folioLetter}2:${folioLetter}${lastRow}`;
      const entryStatusRange = `'${sheetName}'!${statusLetter}2:${statusLetter}${lastRow}`;

      summary.getCell(`A${r}`).value = contest.name;
      summary.getCell(`B${r}`).value = { formula: `COUNTA(${folioRange})` };
      if (contest.max_entries == null) {
        summary.getCell(`C${r}`).value = "Sin límite";
        summary.getCell(`D${r}`).value = "—";
      } else {
        summary.getCell(`C${r}`).value = contest.max_entries;
        summary.getCell(`D${r}`).value = { formula: `MAX(C${r}-B${r},0)` };
      }
      summary.getCell(`E${r}`).value = { formula: `COUNTIF(${entryStatusRange},"Aceptado")` };
      r++;
    });
  }

  summary.getCell(`A1`).alignment = { vertical: "middle" };

  return workbook;
}
