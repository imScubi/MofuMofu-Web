import ExcelJS from "exceljs";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import {
  describeDiscount,
  discountAmount,
  finalPrice,
  type DiscountInput,
} from "@/lib/discount";
import { plansForEvent } from "@/lib/zones";
import { formatEventDates } from "@/lib/formatDates";
import { getContestType } from "@/lib/contestTypes";
import { getSurveyTemplate } from "@/lib/surveyTemplates";
import { formatDayShort } from "@/lib/eventDays";
import type {
  ContestEntryRow,
  ContestRow,
  EventRow,
  EventStandRow,
  RegistrationRow,
  RefundRow,
  SurveyResponseRow,
  SurveyRow,
} from "@/lib/types";

const REG_STATUS_LABEL: Record<string, string> = {
  pending_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const STAND_STATUS_LABEL: Record<string, string> = {
  available: "Disponible",
  pending: "En proceso",
  sold: "Apartado",
  blocked: "No disponible",
};

const MONEY_FORMAT = '"$"#,##0.00';

/**
 * Una celda con fórmula Y su resultado ya calculado.
 *
 * ExcelJS escribe la fórmula sola, sin el valor en caché. Excel de
 * escritorio la recalcula al abrir, pero cualquier otra cosa que mire
 * el archivo —Drive, la vista previa del correo, el visor del celular,
 * o Excel en modo de cálculo manual— muestra la celda en blanco, que
 * fue justo lo que pasó con todo el resumen financiero.
 *
 * Guardando el resultado el número se ve siempre, y la fórmula sigue
 * ahí para recalcularse en cuanto alguien edite un dato.
 */
function calc(
  formula: string,
  result: number | string
): { formula: string; result: number | string } {
  return { formula, result };
}

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
/**
 * El descuento como fórmula de Excel, apoyada en la celda del precio.
 *
 * El MIN es la misma red que en la app: un descuento mayor al precio
 * dejaría un total negativo, que en un corte de caja se lee como si el
 * evento le debiera al expositor.
 */
function discountFormula(
  registration: DiscountInput,
  priceColumn: string,
  rowNumber: number
): string {
  const value = Number(registration.discount_value) || 0;
  const price = `${priceColumn}${rowNumber}`;
  if (!registration.discount_type || value <= 0) return "0";
  return registration.discount_type === "percent"
    ? `MIN(${price},ROUND(${price}*${value}/100,2))`
    : `MIN(${price},${value})`;
}

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
  surveys: SurveyRow[];
  surveyResponses: SurveyResponseRow[];
  /** Bajas con devolución: dinero que entró y volvió a salir. */
  refunds: RefundRow[];
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
  surveys,
  surveyResponses,
  refunds,
}: EventWorkbookData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = EVENT_CONFIG.name;
  workbook.created = new Date();
  // Cinturón y tirantes: además del resultado guardado en cada celda,
  // se le pide a Excel que recalcule todo al abrir.
  workbook.calcProperties.fullCalcOnLoad = true;

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
    { header: "Día que participa", key: "day", width: 18 },
    { header: "Electricidad", key: "electricity", width: 14 },
    { header: "Detalle electricidad", key: "electricityDetails", width: 24 },
    { header: "Gas", key: "gas", width: 10 },
    { header: "Detalle gas", key: "gasDetails", width: 24 },
    { header: "Plan", key: "plan", width: 24 },
    { header: "Compartido", key: "shared", width: 12 },
    { header: "Precio del plan", key: "planPrice", width: 16 },
    // El descuento no rebaja el precio del plan: va aparte, para que se
    // vea cuánto vale el lugar, cuánto se perdonó y cuánto se cobra.
    { header: "Descuento", key: "discount", width: 12 },
    { header: "Descuento ($)", key: "discountAmount", width: 14 },
    { header: "Precio con descuento", key: "finalPrice", width: 20 },
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
      day: r.participation_day
        ? formatDayShort(r.participation_day)
        : "Todos los días",
      electricity: r.needs_electricity ? "Sí" : "No",
      electricityDetails: r.electricity_details ?? "",
      gas: r.needs_gas ? "Sí" : "No",
      gasDetails: r.gas_details ?? "",
      plan: r.plan_label,
      shared: r.is_shared ? "Sí" : "No",
      planPrice: Number(r.plan_price),
      discount: describeDiscount(r),
      // Fórmula y no número: si más tarde corrigen el precio del plan
      // en la hoja, el descuento del 5% se recalcula solo.
      discountAmount: calc(
        discountFormula(r, col("planPrice"), rowNumber),
        discountAmount(r)
      ),
      finalPrice: calc(
        `${col("planPrice")}${rowNumber}-${col("discountAmount")}${rowNumber}`,
        finalPrice(r)
      ),
      amount: Number(r.amount_reported),
      balance: calc(
        `${col("finalPrice")}${rowNumber}-${col("amount")}${rowNumber}`,
        finalPrice(r) - Number(r.amount_reported)
      ),
      status: REG_STATUS_LABEL[r.status] ?? r.status,
      reglamento: r.reglamento_accepted ? "Sí" : "No",
      giros: r.restricted_giros_accepted ? "Sí" : "No",
      notes: r.admin_notes ?? "",
      createdAt: new Date(r.created_at),
    });

    row.getCell("planPrice").numFmt = MONEY_FORMAT;
    row.getCell("discountAmount").numFmt = MONEY_FORMAT;
    row.getCell("finalPrice").numFmt = MONEY_FORMAT;
    row.getCell("amount").numFmt = MONEY_FORMAT;
    row.getCell("balance").numFmt = MONEY_FORMAT;
    row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  });

  const regLastRow = Math.max(registrations.length + 1, 2);
  const range = (key: string) =>
    `Registros!${col(key)}2:${col(key)}${regLastRow}`;
  const planRange = range("plan");
  const planPriceRange = range("planPrice");
  const discountRange = range("discountAmount");
  const finalPriceRange = range("finalPrice");
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
      entryCount: rows.length,
      acceptedCount: rows.filter((e) => e.status === "approved").length,
    };
  });

  // ---------------------------------------------------------------
  // Una hoja por encuesta: una fila por respuesta, una columna por
  // pregunta. Las calificaciones se escriben como número (no como
  // texto) para que el promedio del resumen sea una fórmula de verdad.
  // ---------------------------------------------------------------
  const surveySheets = surveys.map((survey) => {
    const template = getSurveyTemplate(survey.template);
    const sheetName = safeSheetName(survey.title, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: "Fecha", key: "createdAt", width: 20 },
      ...template.questions.map((question) => ({
        header: question.label,
        key: `q_${question.id}`,
        width: question.type === "text" ? 46 : 18,
      })),
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { wrapText: true, vertical: "top" };

    const rows = surveyResponses.filter((r) => r.survey_id === survey.id);
    rows.forEach((response) => {
      const values: Record<string, string | number | Date> = {
        createdAt: new Date(response.created_at),
      };
      for (const question of template.questions) {
        const raw = response.answers?.[question.id] ?? "";
        values[`q_${question.id}`] =
          question.type === "scale" && raw !== "" ? Number(raw) : raw;
      }
      const row = sheet.addRow(values);
      row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
    });

    return {
      survey,
      template,
      sheetName,
      lastRow: Math.max(rows.length + 1, 2),
      letterOf: (questionId: string) => sheet.getColumn(`q_${questionId}`).letter,
      dateLetter: sheet.getColumn("createdAt").letter,
      responseCount: rows.length,
      /** El promedio de una pregunta de calificación, o "" si nadie contestó. */
      averageOf: (questionId: string): number | "" => {
        const values = rows
          .map((response) => Number(response.answers?.[questionId]))
          .filter((n) => Number.isFinite(n));
        if (values.length === 0) return "";
        return values.reduce((sum, n) => sum + n, 0) / values.length;
      },
    };
  });

  // ---------------------------------------------------------------
  // Hoja "Bajas y devoluciones"
  //
  // Un expositor dado de baja ya no está en "Registros", así que sin
  // esta hoja el dinero que pagó y se le devolvió no aparecería en
  // ningún lado — y lo que el evento haya retenido tampoco.
  // ---------------------------------------------------------------
  let refundRange = "";
  let keptRange = "";
  let refundsLastRow = 1;

  if (refunds.length > 0) {
    const refundSheet = workbook.addWorksheet("Bajas y devoluciones");
    refundSheet.columns = [
      { header: "Folio", key: "folio", width: 9 },
      { header: "Stand", key: "stand", width: 8 },
      { header: "Negocio", key: "business", width: 24 },
      { header: "Contacto", key: "contact", width: 20 },
      { header: "Teléfono", key: "phone", width: 16 },
      { header: "Plan", key: "plan", width: 24 },
      { header: "Había pagado", key: "paid", width: 16 },
      { header: "Se le devolvió", key: "refunded", width: 16 },
      { header: "Retuvo el evento", key: "kept", width: 18 },
      { header: "Nota", key: "note", width: 34 },
      { header: "Fecha de la baja", key: "createdAt", width: 18 },
    ];
    refundSheet.getRow(1).font = { bold: true };

    const refundCol = (key: string) => refundSheet.getColumn(key).letter;

    refunds.forEach((refund) => {
      const rowNumber = refundSheet.rowCount + 1;
      const paid = Number(refund.amount_paid);
      const returned = Number(refund.amount_refunded);

      const row = refundSheet.addRow({
        folio: refund.folio_number,
        stand: refund.stand_id,
        business: refund.business_name,
        contact: refund.contact_name ?? "",
        phone: refund.phone ?? "",
        plan: refund.plan_label ?? "",
        paid,
        refunded: returned,
        kept: calc(
          `${refundCol("paid")}${rowNumber}-${refundCol("refunded")}${rowNumber}`,
          paid - returned
        ),
        note: refund.note ?? "",
        createdAt: new Date(refund.created_at),
      });

      row.getCell("paid").numFmt = MONEY_FORMAT;
      row.getCell("refunded").numFmt = MONEY_FORMAT;
      row.getCell("kept").numFmt = MONEY_FORMAT;
      row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
    });

    refundsLastRow = Math.max(refunds.length + 1, 2);
    const refundRangeOf = (key: string) =>
      `'Bajas y devoluciones'!${refundCol(key)}2:${refundCol(key)}${refundsLastRow}`;
    refundRange = refundRangeOf("refunded");
    keptRange = refundRangeOf("kept");
  }

  // ---------------------------------------------------------------
  // Hoja "Resumen" — fórmulas en vivo sobre las hojas anteriores
  // ---------------------------------------------------------------
  const summary = workbook.addWorksheet("Resumen");

  // Los mismos totales que enseña el panel, calculados aquí para poder
  // guardarlos junto a cada fórmula. "Vivos" son los registros que no
  // están rechazados: los demás no le deben nada al evento.
  const label = (r: RegistrationRow) => REG_STATUS_LABEL[r.status] ?? r.status;
  const liveRegs = registrations.filter((r) => label(r) !== "Rechazado");
  const sum = (rows: RegistrationRow[], of: (r: RegistrationRow) => number) =>
    rows.reduce((total, r) => total + of(r), 0);

  const totalListPrice = sum(liveRegs, (r) => Number(r.plan_price));
  const totalDiscounts = sum(liveRegs, discountAmount);
  const totalExpected = sum(liveRegs, finalPrice);
  const totalCollected = sum(liveRegs, (r) => Number(r.amount_reported));
  const collectedApproved = sum(
    registrations.filter((r) => label(r) === "Aprobado"),
    (r) => Number(r.amount_reported)
  );
  const totalBalance = totalExpected - totalCollected;

  const standsByStatus = (statusLabel: string) =>
    reservableStands.filter(
      (st) => (STAND_STATUS_LABEL[st.status] ?? st.status) === statusLabel
    ).length;

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
  const statRows: [string, string, number][] = [
    [
      "Total de stands",
      `COUNTA(Stands!A2:A${standsLastRow})`,
      reservableStands.length,
    ],
    [
      "Disponibles",
      `COUNTIF(Stands!B2:B${standsLastRow},"Disponible")`,
      standsByStatus("Disponible"),
    ],
    [
      "En proceso de pago",
      `COUNTIF(Stands!B2:B${standsLastRow},"En proceso")`,
      standsByStatus("En proceso"),
    ],
    [
      "Apartados",
      `COUNTIF(Stands!B2:B${standsLastRow},"Apartado")`,
      standsByStatus("Apartado"),
    ],
  ];
  statRows.forEach(([rowLabel, formula, value]) => {
    summary.getCell(`A${r}`).value = rowLabel;
    summary.getCell(`B${r}`).value = calc(formula, value);
    r++;
  });

  r++;
  summary.getCell(`A${r}`).value = "Resumen financiero";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  // El precio de lista y los descuentos van en renglones propios: en un
  // corte de caja no es lo mismo "se cobró menos" que "se decidió
  // cobrar menos", y el segundo dato se pierde si sólo queda el total.
  summary.getCell(`A${r}`).value = "Precio de lista (registros no rechazados)";
  summary.getCell(`B${r}`).value = calc(
    `SUMIFS(${planPriceRange},${statusRange},"<>Rechazado")`,
    totalListPrice
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  summary.getCell(`A${r}`).value = "Descuentos otorgados";
  summary.getCell(`B${r}`).value = calc(
    `SUMIFS(${discountRange},${statusRange},"<>Rechazado")`,
    totalDiscounts
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  const expectedRow = r;
  summary.getCell(`A${r}`).value = "Ingreso esperado (ya con descuentos)";
  summary.getCell(`B${r}`).value = calc(
    `SUMIFS(${finalPriceRange},${statusRange},"<>Rechazado")`,
    totalExpected
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  const collectedRow = r;
  summary.getCell(`A${r}`).value = "Recaudado (montos reportados, sin rechazados)";
  summary.getCell(`B${r}`).value = calc(
    `SUMIFS(${amountRange},${statusRange},"<>Rechazado")`,
    totalCollected
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  summary.getCell(`A${r}`).value = "Recaudado de registros aprobados";
  summary.getCell(`B${r}`).value = calc(
    `SUMIFS(${amountRange},${statusRange},"Aprobado")`,
    collectedApproved
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  r++;

  const balanceRow = r;
  summary.getCell(`A${r}`).value = "Saldo pendiente de cobro";
  summary.getCell(`B${r}`).value = calc(
    `B${expectedRow}-B${collectedRow}`,
    totalBalance
  );
  summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
  summary.getCell(`B${r}`).font = { bold: true };
  r += 2;

  // Las bajas van en su propio bloque, separadas de lo que se espera
  // cobrar: mezclarlas escondería que ese dinero entró y volvió a salir.
  if (refunds.length > 0) {
    const totalRefunded = refunds.reduce(
      (total, refund) => total + Number(refund.amount_refunded),
      0
    );
    const totalKept = refunds.reduce(
      (total, refund) =>
        total + (Number(refund.amount_paid) - Number(refund.amount_refunded)),
      0
    );

    summary.getCell(`A${r}`).value = "Bajas con devolución";
    summary.getCell(`A${r}`).font = { bold: true };
    r++;

    summary.getCell(`A${r}`).value = `Expositores dados de baja`;
    summary.getCell(`B${r}`).value = refunds.length;
    r++;

    summary.getCell(`A${r}`).value = "Devuelto a expositores (salió de caja)";
    summary.getCell(`B${r}`).value = calc(`SUM(${refundRange})`, totalRefunded);
    summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
    r++;

    const keptRow = r;
    summary.getCell(`A${r}`).value = "Retenido de esas bajas (se quedó en caja)";
    summary.getCell(`B${r}`).value = calc(`SUM(${keptRange})`, totalKept);
    summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
    r++;

    summary.getCell(`A${r}`).value = "En caja (recaudado + retenido)";
    summary.getCell(`B${r}`).value = calc(
      `B${collectedRow}+B${keptRow}`,
      totalCollected + totalKept
    );
    summary.getCell(`B${r}`).numFmt = MONEY_FORMAT;
    summary.getCell(`B${r}`).font = { bold: true };
    r += 2;
  }

  summary.getCell(`A${r}`).value = "Desglose por plan (registros no rechazados)";
  summary.getCell(`A${r}`).font = { bold: true };
  r++;

  const planLabels = Array.from(
    new Map(
      plansForEvent(event.extra_plans).map((p) => [
        `${p.categoryLabel} · ${p.days} ${p.days === 1 ? "día" : "días"}`,
        true,
      ])
    ).keys()
  );
  planLabels.forEach((planLabel) => {
    summary.getCell(`A${r}`).value = planLabel;
    summary.getCell(`B${r}`).value = calc(
      `SUMIFS(${finalPriceRange},${planRange},"${planLabel}",${statusRange},"<>Rechazado")`,
      sum(
        liveRegs.filter((reg) => reg.plan_label === planLabel),
        finalPrice
      )
    );
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

  // El valor guardado envejece un día por día; la fórmula lo corrige en
  // cuanto Excel recalcula, que es al abrir.
  const daysLeft = Math.round(
    (deadline.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000
  );
  summary.getCell(`A${r}`).value = "Días restantes";
  summary.getCell(`B${r}`).value = calc(`B${deadlineRow}-TODAY()`, daysLeft);
  const daysLeftRow = r;
  r++;

  summary.getCell(`A${r}`).value = "Cobro sugerido por día para liquidar a tiempo";
  summary.getCell(`B${r}`).value = calc(
    `IF(B${daysLeftRow}>0,B${balanceRow}/B${daysLeftRow},B${balanceRow})`,
    daysLeft > 0 ? totalBalance / daysLeft : totalBalance
  );
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

    contestSheets.forEach((sheetInfo) => {
      const {
        contest,
        sheetName,
        lastRow,
        folioLetter,
        statusLetter,
        entryCount,
        acceptedCount,
      } = sheetInfo;
      const folioRange = `'${sheetName}'!${folioLetter}2:${folioLetter}${lastRow}`;
      const entryStatusRange = `'${sheetName}'!${statusLetter}2:${statusLetter}${lastRow}`;

      summary.getCell(`A${r}`).value = contest.name;
      summary.getCell(`B${r}`).value = calc(`COUNTA(${folioRange})`, entryCount);
      if (contest.max_entries == null) {
        summary.getCell(`C${r}`).value = "Sin límite";
        summary.getCell(`D${r}`).value = "—";
      } else {
        summary.getCell(`C${r}`).value = contest.max_entries;
        summary.getCell(`D${r}`).value = calc(
          `MAX(C${r}-B${r},0)`,
          Math.max(contest.max_entries - entryCount, 0)
        );
      }
      summary.getCell(`E${r}`).value = calc(
        `COUNTIF(${entryStatusRange},"Aceptado")`,
        acceptedCount
      );
      r++;
    });
  }

  // ---------------------------------------------------------------
  // Encuestas: cuántas respuestas y el promedio de cada calificación.
  // ---------------------------------------------------------------
  if (surveySheets.length > 0) {
    r += 2;
    summary.getCell(`A${r}`).value = "Encuestas de retroalimentación";
    summary.getCell(`A${r}`).font = { bold: true };
    r++;

    surveySheets.forEach((sheetInfo) => {
      const {
        survey,
        template,
        sheetName,
        lastRow,
        letterOf,
        dateLetter,
        responseCount,
        averageOf,
      } = sheetInfo;

      summary.getCell(`A${r}`).value = survey.title;
      summary.getCell(`A${r}`).font = { bold: true };
      summary.getCell(`B${r}`).value = calc(
        `COUNTA('${sheetName}'!${dateLetter}2:${dateLetter}${lastRow})`,
        responseCount
      );
      summary.getCell(`C${r}`).value = "respuestas";
      r++;

      template.questions
        .filter((q) => q.type === "scale")
        .forEach((question) => {
          const letter = letterOf(question.id);
          summary.getCell(`A${r}`).value = `   Promedio — ${question.label}`;
          summary.getCell(`B${r}`).value = calc(
            `IFERROR(AVERAGE('${sheetName}'!${letter}2:${letter}${lastRow}),"")`,
            averageOf(question.id)
          );
          summary.getCell(`B${r}`).numFmt = "0.00";
          r++;
        });
    });
  }

  summary.getCell(`A1`).alignment = { vertical: "middle" };

  return workbook;
}
