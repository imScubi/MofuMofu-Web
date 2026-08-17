import { PlanMap } from "@/components/admin/PlanMap";
import { EVENT_CONFIG, eventVenue } from "@/lib/eventConfig";
import { eventDays, formatDayLong } from "@/lib/eventDays";
import { formatEventDates } from "@/lib/formatDates";
import { formatTimeRange } from "@/lib/formatTime";
import { logoPublicUrl } from "@/lib/logoUrl";
import { standsInRowOrder } from "@/lib/standLayout";
import type { EventRow, EventScheduleRow, RegistrationRow } from "@/lib/types";

interface LogisticsPlanProps {
  event: EventRow;
  registrations: RegistrationRow[];
  schedule: EventScheduleRow[];
}

/**
 * El documento que se le manda a la sede, generado a partir de lo que ya
 * está en la base: si alguien cancela y se reacomodan los stands, esto
 * sale correcto sin volver a escribirlo.
 *
 * Está pensado para imprimirse (o guardarse como PDF desde el navegador),
 * así que cada día empieza en página nueva.
 */
export function LogisticsPlan({ event, registrations, schedule }: LogisticsPlanProps) {
  const days = eventDays(event.date_start, event.date_end);
  const venue = eventVenue(event);

  // Un registro cuenta para un día si es de todos los días o si eligió
  // ese. Los cancelados y rechazados no van al plan: su lugar está libre.
  const activeRegistrations = registrations.filter(
    (r) => r.status !== "rejected" && r.status !== "cancelled"
  );
  const forDay = (day: string) =>
    activeRegistrations.filter(
      (r) => !r.participation_day || r.participation_day === day
    );

  return (
    <div className="mofu-plan mx-auto max-w-[900px] space-y-8">
      <header>
        <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-pink-700">
          Plan logístico
        </p>
        <h1 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink">
          {EVENT_CONFIG.name} — {event.name}
        </h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          {formatEventDates(event.date_start, event.date_end)}
          {venue.line ? ` · ${venue.line}` : ""}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Contacto: {EVENT_CONFIG.contactEmail} · {EVENT_CONFIG.contactWhatsapp}
        </p>
      </header>

      <section>
        <h2 className="font-heading text-xl font-bold text-ink">
          1. Actividades y cronograma
        </h2>
        {schedule.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Esta edición todavía no tiene itinerario cargado.
          </p>
        ) : (
          <div className="mt-3 space-y-5">
            {days.map((day) => {
              const blocks = schedule
                .filter((b) => b.day === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              if (blocks.length === 0) return null;

              return (
                <div key={day}>
                  <h3 className="font-heading text-base font-bold text-ink">
                    {formatDayLong(day)}
                  </h3>
                  <table className="mt-1.5 w-full text-left text-[13.5px]">
                    <tbody>
                      {blocks.map((block) => (
                        <tr key={block.id} className="border-b border-pink-50 last:border-0">
                          <td className="w-[150px] py-1.5 pr-3 align-top font-mono text-[12.5px] text-pink-700">
                            {formatTimeRange(block.start_time, block.end_time)}
                          </td>
                          <td className="py-1.5 align-top">
                            <span className="font-semibold text-ink">{block.title}</span>
                            {block.notes && (
                              <span className="block text-[12.5px] text-ink-soft">
                                {block.notes}
                              </span>
                            )}
                          </td>
                          <td className="w-[92px] py-1.5 pl-3 align-top text-right text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                            {block.kind === "montaje" ? "Montaje" : "Actividad"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {days.map((day) => {
        const dayRegistrations = forDay(day);
        const byStand = new Map(dayRegistrations.map((r) => [r.stand_id, r]));
        const withPower = dayRegistrations.filter((r) => r.needs_electricity).length;
        const withGas = dayRegistrations.filter((r) => r.needs_gas).length;

        // Ordenados como están en el plano, no por folio: así el staff
        // recorre el mapa de un lado a otro sin ir y venir.
        const ordered = standsInRowOrder().flatMap((standId) => {
          const registration = byStand.get(standId);
          return registration ? [{ standId, registration }] : [];
        });

        // Un stand que no existe en el plano (por ejemplo uno que se
        // agregó a mano) no puede quedar fuera del documento.
        const offMap = dayRegistrations.filter(
          (r) => !standsInRowOrder().includes(r.stand_id)
        );

        return (
          <section key={day} className="mofu-plan-page">
            <h2 className="font-heading text-xl font-bold text-ink">
              Acomodo — {formatDayLong(day)}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-ink-soft">
              {dayRegistrations.length} stands ocupados · {withPower} con
              necesidades eléctricas · {withGas} con gas
            </p>

            <div className="mt-3">
              <PlanMap registrationsByStand={byStand} />
            </div>

            <table className="mt-4 w-full text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-pink-100 text-ink-soft">
                  <th className="w-[54px] py-2 pr-2 text-xs font-semibold">Stand</th>
                  <th className="py-2 pr-2 text-xs font-semibold">Negocio</th>
                  <th className="py-2 text-xs font-semibold">
                    Equipo eléctrico requerido
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...ordered, ...offMap.map((r) => ({ standId: r.stand_id, registration: r }))]
                  .length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-ink-soft">
                      Ningún expositor confirmado para este día.
                    </td>
                  </tr>
                ) : (
                  [
                    ...ordered,
                    ...offMap.map((r) => ({ standId: r.stand_id, registration: r })),
                  ].map(({ standId, registration }) => {
                    const logo = logoPublicUrl(registration.logo_path);
                    return (
                      <tr key={standId} className="border-b border-pink-50">
                        <td className="py-2 pr-2 align-top font-mono font-medium text-pink-700">
                          {standId}
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <div className="flex items-center gap-2">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logo}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded border border-pink-100 bg-white object-contain"
                              />
                            ) : null}
                            <span className="font-semibold text-ink">
                              {registration.business_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 align-top text-ink-soft">
                          {registration.needs_electricity
                            ? registration.electricity_details ||
                              "Sí (sin detalle capturado)"
                            : "1 Foco, cargador de celular 20 W."}
                          {registration.needs_gas && (
                            <span className="block text-danger-600">
                              Gas: {registration.gas_details || "sí"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
