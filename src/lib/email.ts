import "server-only";
import { EVENT_CONFIG, eventVenue } from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import { formatDayLong } from "@/lib/eventDays";
import { absoluteUrl } from "@/lib/site";
import type { EventRow } from "@/lib/types";

/**
 * El correo con el folio.
 *
 * El folio es la llave para completar el pago después, y hasta ahora
 * sólo vivía en una pantalla que se pierde al cerrar la pestaña. Este
 * correo es la copia que queda.
 *
 * Regla de oro: mandar el correo NUNCA puede tumbar un registro. Si
 * falla el proveedor, si falta la llave, si se cae la red — se anota en
 * el log y el registro sigue su camino. Un expositor con lugar apartado
 * y sin correo es un problema chico; uno que perdió su lugar porque el
 * correo falló, no.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface FolioEmailData {
  to: string;
  folioNumber: number;
  standId: string;
  businessName: string;
  contactName: string;
  planLabel: string;
  /** Lo que le toca pagar, ya con descuento si lo hubiera. */
  totalDue: number;
  amountReported: number;
  participationDay: string | null;
  event: EventRow;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const money = (amount: number) =>
  `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })} ${EVENT_CONFIG.currency}`;

/** El texto plano: lo que ven los clientes que no cargan HTML. */
function plainText(data: FolioEmailData): string {
  const venue = eventVenue(data.event);
  const pending = Math.max(data.totalDue - data.amountReported, 0);

  return [
    `¡Tu lugar en ${EVENT_CONFIG.name} quedó apartado!`,
    "",
    `TU FOLIO: ${data.folioNumber}`,
    "",
    `Negocio: ${data.businessName}`,
    `Stand: #${data.standId}`,
    `Plan: ${data.planLabel}`,
    data.participationDay ? `Día: ${formatDayLong(data.participationDay)}` : null,
    `Edición: ${data.event.name} · ${formatEventDates(data.event.date_start, data.event.date_end)}`,
    venue.line ? `Sede: ${venue.line}` : null,
    "",
    `Reportaste: ${money(data.amountReported)} de ${money(data.totalDue)}`,
    pending > 0
      ? `Te falta por liquidar: ${money(pending)} — antes del ${enFrase(data.event.payment_deadline)}`
      : "Tu pago quedó completo.",
    "",
    "¿QUÉ SIGUE?",
    "Revisamos tu comprobante a mano y te confirmamos por este medio o por WhatsApp.",
    pending > 0
      ? `Para completar tu pago entra a ${absoluteUrl("/registro/completar")} con tu folio y tu teléfono.`
      : null,
    "",
    `Guarda este correo: tu folio ${data.folioNumber} es lo que te va a pedir el sistema.`,
    "",
    `Cualquier duda, contéstanos aquí o escríbenos a ${EVENT_CONFIG.contactEmail}.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** "Miércoles 30" a media frase se lee raro: va en minúscula. */
function enFrase(fecha: string): string {
  const texto = formatDayLong(fecha);
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function html(data: FolioEmailData): string {
  const venue = eventVenue(data.event);
  const pending = Math.max(data.totalDue - data.amountReported, 0);

  // Estilos en línea y tablas: es lo único que respetan los clientes de
  // correo. Nada de flexbox ni de hojas de estilo externas.
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#6F5A64;font-size:14px;">${label}</td>
      <td style="padding:6px 0;color:#3A2B33;font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#FFF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #FFDCE7;">
    <tr><td style="background:#FFF1F5;padding:26px 24px;text-align:center;">
      <p style="margin:0;color:#A32450;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">${EVENT_CONFIG.name}</p>
      <h1 style="margin:6px 0 0;color:#3A2B33;font-size:24px;line-height:1.2;">¡Tu lugar quedó apartado!</h1>
      <p style="margin:14px 0 0;color:#6F5A64;font-size:14px;">Tu folio es</p>
      <p style="margin:2px 0 0;color:#A32450;font-size:42px;font-weight:800;letter-spacing:.04em;">${data.folioNumber}</p>
      <p style="margin:8px 0 0;color:#6F5A64;font-size:13px;">Guárdalo: es lo que te va a pedir el sistema.</p>
    </td></tr>

    <tr><td style="padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Negocio", data.businessName)}
        ${row("Stand", `#${data.standId}`)}
        ${row("Plan", data.planLabel)}
        ${data.participationDay ? row("Día", formatDayLong(data.participationDay)) : ""}
        ${row("Edición", `${data.event.name}`)}
        ${row("Fechas", formatEventDates(data.event.date_start, data.event.date_end))}
        ${venue.line ? row("Sede", venue.line) : ""}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#FFF7F2;border-radius:14px;">
        <tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("Reportaste", money(data.amountReported))}
            ${row("Total de tu plan", money(data.totalDue))}
            ${
              pending > 0
                ? row("Te falta", `<span style="color:#C2352C;">${money(pending)}</span>`)
                : row("Estado", "Pago completo")
            }
          </table>
        </td></tr>
      </table>

      ${
        pending > 0
          ? `<p style="margin:18px 0 0;color:#3A2B33;font-size:14px;line-height:1.6;">
              Puedes completar el resto antes del <strong>${enFrase(data.event.payment_deadline)}</strong>.
            </p>
            <p style="margin:14px 0 0;text-align:center;">
              <a href="${absoluteUrl("/registro/completar")}" style="display:inline-block;background:#E8628E;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:15px;">Completar mi pago</a>
            </p>`
          : ""
      }

      <p style="margin:20px 0 0;color:#6F5A64;font-size:13.5px;line-height:1.6;">
        Una persona del staff revisa tu comprobante a mano y te confirmamos
        por aquí o por WhatsApp. Si algo no cuadra, contéstanos este correo
        o escríbenos a <a href="mailto:${EVENT_CONFIG.contactEmail}" style="color:#A32450;">${EVENT_CONFIG.contactEmail}</a>.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Manda el correo del folio. Devuelve si se pudo o no, pero nunca lanza:
 * quien llama no debería tener que envolverlo en un try.
 */
export async function sendFolioEmail(data: FolioEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(
      `[email] Sin RESEND_API_KEY: no se mandó el folio ${data.folioNumber} a ${data.to}`
    );
    return false;
  }

  const from = process.env.EMAIL_FROM || `${EVENT_CONFIG.name} <hola@mofumofumarket.com>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [data.to],
        reply_to: EVENT_CONFIG.contactEmail,
        subject: `Tu folio ${data.folioNumber} · ${EVENT_CONFIG.name}`,
        html: html(data),
        text: plainText(data),
      }),
      // Un proveedor lento no puede dejar colgado el registro.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[email] Resend respondió ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] No se pudo mandar el folio:", error);
    return false;
  }
}
