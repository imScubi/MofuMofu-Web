import {
  describePrize,
  formatMoney,
  getRegulationTemplate,
  parsePrizeCategories,
  placeLabel,
  placeMedal,
  type RegulationSection,
} from "@/lib/contestRegulation";
import { EVENT_CONFIG, eventVenue } from "@/lib/eventConfig";
import { formatDayLong } from "@/lib/eventDays";
import { formatEventDates } from "@/lib/formatDates";
import type { ContestRow, EventRow } from "@/lib/types";

/**
 * El reglamento de una convocatoria, armado con los datos de la
 * convocatoria: día, cuotas, cupos y premios salen de la base, el resto
 * del texto de la plantilla. Cambiar un premio en el panel cambia lo que
 * lee el participante, sin volver a subir un PDF.
 *
 * Se usa en dos lados: dentro del formulario de inscripción y en su
 * propia página imprimible.
 */
export function ContestRegulation({
  contest,
  event,
}: {
  contest: ContestRow;
  event: EventRow;
}) {
  const template = getRegulationTemplate(contest.type);
  const categories = parsePrizeCategories(contest.prize_categories);
  const venue = eventVenue(event);

  // Las secciones se numeran corridas aunque el bloque de premios esté a
  // la mitad y tenga una tabla por categoría.
  let section = 0;
  const next = () => ++section;

  return (
    <article className="mofu-plan space-y-6 text-ink">
      <header className="border-b-2 border-pink-100 pb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-pink-700">
          {EVENT_CONFIG.name}
        </p>
        <h1 className="mt-1 font-heading text-[26px] font-extrabold leading-[1.15] text-ink">
          {template.title}
        </h1>
        <p className="mt-0.5 font-heading text-base font-bold text-ink-soft">
          Reglamento oficial
        </p>
        <p className="mt-2 text-[14px] text-ink-soft">
          📅{" "}
          {contest.day
            ? formatDayLong(contest.day)
            : formatEventDates(event.date_start, event.date_end)}
          {" · "}
          {event.name}
          {venue.line ? ` · ${venue.line}` : ""}
        </p>
      </header>

      <Section index={next()} title="Sobre la actividad">
        <p className="text-[14.5px] leading-[1.65] text-ink-soft">{template.about}</p>
        {contest.description && (
          <p className="mt-2 text-[14.5px] leading-[1.65] text-ink-soft">
            {contest.description}
          </p>
        )}
      </Section>

      {/* Cupos y cuotas: salen de las categorías reales, no de un texto
          escrito a mano que se olvida actualizar. */}
      {categories.length > 0 && (
        <Section index={next()} title="Cupos y costo de entrada">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-pink-100 text-ink-soft">
                <th className="py-1.5 pr-3 text-xs font-semibold">Categoría</th>
                <th className="py-1.5 pr-3 text-xs font-semibold">Costo de entrada</th>
                <th className="py-1.5 text-xs font-semibold">Cupo</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.label} className="border-b border-pink-50 last:border-0">
                  <td className="py-2 pr-3 font-semibold">{category.label}</td>
                  <td className="py-2 pr-3">
                    {category.entryFee > 0 ? formatMoney(category.entryFee) : "Gratis"}
                  </td>
                  <td className="py-2 text-ink-soft">
                    {category.slots != null
                      ? `${category.slots} lugares`
                      : contest.max_entries != null
                        ? `${contest.max_entries} lugares en total`
                        : "Sin límite"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {template.before.map((s) => (
        <Section key={s.title} index={next()} title={s.title}>
          <SectionBody section={s} />
        </Section>
      ))}

      {categories.map((category) => (
        <Section
          key={category.label}
          index={next()}
          title={
            categories.length > 1
              ? `Premiación — ${category.label}`
              : "Premiación"
          }
        >
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-pink-100 text-ink-soft">
                <th className="w-[140px] py-1.5 pr-3 text-xs font-semibold">Lugar</th>
                <th className="py-1.5 text-xs font-semibold">Premio</th>
              </tr>
            </thead>
            <tbody>
              {category.places.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-2 text-ink-soft">
                    Premiación por definir.
                  </td>
                </tr>
              ) : (
                category.places.map((place, index) => (
                  <tr key={index} className="border-b border-pink-50 last:border-0">
                    <td className="py-2 pr-3 font-semibold">
                      {placeMedal(index)} {placeLabel(index)}
                    </td>
                    <td className="py-2 text-ink-soft">
                      {describePrize(
                        place,
                        categories.length > 1 ? category.label : undefined
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>
      ))}

      {categories.some((c) => c.places.some((p) => p.percent > 0)) && (
        <p className="text-[13.5px] leading-[1.6] text-ink-soft">
          {template.prizeNote}
        </p>
      )}

      {template.after.map((s) => (
        <Section key={s.title} index={next()} title={s.title}>
          <SectionBody section={s} />
        </Section>
      ))}

      {contest.regulation_notes && (
        <Section index={next()} title="Avisos de esta edición">
          <p className="whitespace-pre-line text-[14.5px] leading-[1.65] text-ink-soft">
            {contest.regulation_notes}
          </p>
        </Section>
      )}

      <footer className="border-t border-pink-100 pt-3 text-[12.5px] text-ink-soft">
        {EVENT_CONFIG.name} — Reglamento sujeto a actualizaciones antes de la
        fecha del evento. Dudas: {EVENT_CONFIG.contactEmail} ·{" "}
        {EVENT_CONFIG.contactWhatsapp}
      </footer>
    </article>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-[17px] font-bold text-ink">
        <span className="mr-2 text-pink-700">{index}</span>
        {title}
      </h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function SectionBody({ section }: { section: RegulationSection }) {
  return (
    <>
      {section.paragraphs?.map((text) => (
        <p key={text} className="text-[14.5px] leading-[1.65] text-ink-soft">
          {text}
        </p>
      ))}
      {section.bullets && (
        <ul className="space-y-1.5">
          {section.bullets.map((text) => (
            <li
              key={text}
              className="flex gap-2 text-[14.5px] leading-[1.6] text-ink-soft"
            >
              <span className="text-pink-300">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
