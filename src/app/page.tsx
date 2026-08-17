import Image from "next/image";
import Link from "next/link";
import { StructuredData } from "@/components/StructuredData";
import {
  EVENT_CONFIG,
  PRICING_PLANS,
  STAND_INCLUDES,
  venueLine,
} from "@/lib/eventConfig";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import { createClient } from "@/lib/supabase/client";
import { contestAvailability } from "@/lib/contestStatus";
import { getContestType } from "@/lib/contestTypes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import {
  FlowerShape,
  HeartShape,
  ParkWave,
  StarShape,
} from "@/components/ui/Decorations";
import type { ContestRow, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const steps = [
  {
    Shape: FlowerShape,
    title: "Elige tu stand",
    text: "Explora el mapa interactivo y selecciona el espacio que más te guste.",
  },
  {
    Shape: HeartShape,
    title: "Cuéntanos de tu negocio",
    text: "Comparte tus datos de contacto, redes sociales y necesidades de electricidad o gas.",
  },
  {
    Shape: StarShape,
    title: "Sube tu comprobante",
    text: "Adjunta la captura de tu transferencia y listo, tu lugar queda apartado.",
  },
];

export default async function Home() {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("is_open", true)
    .order("date_start");

  const events = (data as EventRow[]) ?? [];

  // Las convocatorias sólo aparecen en la portada si hay alguna abierta:
  // un bloque que sólo dice "no hay nada" no le sirve a nadie.
  const { data: contestsData } = events.length
    ? await supabase
        .from("contests")
        .select("*")
        .in(
          "event_id",
          events.map((e) => e.id)
        )
        .order("created_at")
    : { data: [] };
  const openContests = ((contestsData as ContestRow[]) ?? []).filter(
    (c) => contestAvailability(c).open
  );

  const where = venueLine();
  const cheapest = Math.min(...PRICING_PLANS.map((p) => p.price));
  const nextEvent = events[0];

  // Las respuestas que la gente escribe en Google. Se muestran en la
  // página y las mismas se le entregan al buscador como datos: si sólo
  // estuvieran en el código serían una mentira para el buscador.
  const faqs = [
    {
      question: `¿Qué es ${EVENT_CONFIG.name}?`,
      answer: `${EVENT_CONFIG.name} es un mercado de estética kawaii${
        where ? ` que se realiza en ${where}` : ""
      }. Reúne expositores independientes de ropa, accesorios, arte, ilustración, manualidades, papelería, coleccionables y comida, además de concursos y dinámicas durante el día.`,
    },
    {
      question: "¿Cómo aparto un stand como expositor?",
      answer:
        "Desde esta misma página: eliges tu lugar en el mapa interactivo, escoges tu plan, llenas los datos de tu negocio, aceptas el reglamento y subes la captura de tu transferencia. Al terminar recibes un folio para dar seguimiento a tu pago.",
    },
    {
      question: "¿Cuánto cuesta participar como expositor?",
      answer: `Los planes empiezan en $${cheapest.toLocaleString("es-MX")} ${
        EVENT_CONFIG.currency
      } e incluyen ${STAND_INCLUDES.join(", ").toLowerCase()}. El precio cambia según si expones uno o dos días, si vendes comida y si compartes el espacio con otro negocio.`,
    },
    {
      question: "¿Puedo participar en los concursos sin ser expositor?",
      answer:
        "Sí. Las convocatorias de dance cover, cosplay y torneos de cartas son independientes del registro de expositores: se inscribe cualquier persona desde la sección de convocatorias, mientras haya lugares disponibles.",
    },
    ...(nextEvent
      ? [
          {
            question: "¿Cuándo es la próxima edición?",
            answer: `La próxima edición es ${nextEvent.name}: ${formatEventDates(
              nextEvent.date_start,
              nextEvent.date_end
            )}${where ? ` en ${where}` : ""}.`,
          },
        ]
      : []),
  ];

  return (
    <main className="flex-1">
      <StructuredData events={events} faqs={faqs} />
      <section className="mofu-confetti relative overflow-hidden px-5 pt-12 pb-14 sm:pt-24 sm:pb-28">
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-[1.15fr_1fr]">
          <div className="text-center sm:text-left">
            <Image
              src="/logo-mofumofu.webp"
              alt={EVENT_CONFIG.name}
              width={520}
              height={388}
              className="mx-auto h-auto w-[160px] sm:mx-0 sm:w-[200px]"
              priority
            />
            <h1 className="mt-3.5 font-heading text-[34px] font-extrabold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[52px]">
              Aparta tu stand
              <br />
              en el mercado
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-[1.65] text-ink-soft sm:mx-0 sm:text-[17px]">
              Selecciona tu lugar en el mapa, cuéntanos de tu negocio y confirma
              tu pago en unos minutos.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:items-start">
              <Link href="/registro" className="w-full max-w-[340px] sm:w-auto">
                <Button size="lg" className="w-full">
                  Reservar mi stand
                </Button>
              </Link>
              <p className="text-[13.5px] leading-[1.55] text-ink-soft">
                ¿Ya reservaste y vas a completar tu pago?{" "}
                <Link
                  href="/registro/completar"
                  className="font-bold text-pink-700 underline underline-offset-2"
                >
                  Completa tu pago aquí
                </Link>
              </p>
              {openContests.length > 0 && (
                <p className="text-[13.5px] leading-[1.55] text-ink-soft">
                  ¿Vienes a concursar?{" "}
                  <Link
                    href="/convocatorias"
                    className="font-bold text-pink-700 underline underline-offset-2"
                  >
                    Inscríbete en una convocatoria
                  </Link>
                </p>
              )}
            </div>
          </div>

          <Image
            src="/char-gato.webp"
            alt=""
            aria-hidden="true"
            width={600}
            height={786}
            className="mofu-float mx-auto hidden h-auto w-[260px] sm:block"
            priority
          />
        </div>

        <ParkWave className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full sm:h-16" />
      </section>

      {events.length > 0 && (
        <section className="bg-mint-100/40 px-5 pb-14 pt-12 sm:pb-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-heading text-2xl font-bold leading-[1.15] text-ink sm:text-[30px]">
              Próximas fechas
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="p-5">
                  <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                    {formatEventDates(event.date_start, event.date_end)}
                  </p>
                  <p className="mt-1.5 font-heading text-lg font-bold text-ink">
                    {event.name}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-soft">
                    Límite de pago:{" "}
                    <span className="font-semibold text-amber-500">
                      {formatDate(event.payment_deadline)}
                    </span>
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {openContests.length > 0 && (
        <section className="px-5 pt-12 pb-2 sm:pt-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-heading text-2xl font-bold leading-[1.15] text-ink sm:text-[30px]">
              Convocatorias abiertas
            </h2>
            <p className="mt-2 text-center text-[14.5px] text-ink-soft">
              Concursos y torneos en los que puedes participar.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {openContests.map((contest) => {
                const spotsLeft = contestAvailability(contest).spotsLeft;
                return (
                  <Card key={contest.id} className="p-5">
                    <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                      {getContestType(contest.type).label}
                    </p>
                    <p className="mt-1.5 font-heading text-lg font-bold leading-tight text-ink">
                      {contest.name}
                    </p>
                    {spotsLeft != null && (
                      <p className="mt-2 text-[13.5px] text-ink-soft">
                        Quedan{" "}
                        <span className="font-bold text-mint-500">{spotsLeft}</span> de{" "}
                        {contest.max_entries} lugares
                      </p>
                    )}
                    <Link href={`/convocatorias/${contest.id}`} className="mt-4 block">
                      <Button variant="secondary" className="w-full">
                        Inscribirme
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-center gap-3">
            <Character name="camaleon" size={92} />
            <Character name="raton" size={104} />
          </div>
          <h2 className="mt-1 text-center font-heading text-2xl font-bold leading-[1.15] text-ink sm:text-[30px]">
            Cómo funciona
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {steps.map(({ Shape, title, text }, i) => (
              <Card key={title} className="p-6">
                <div className="flex items-center gap-3">
                  <Shape className="h-8 w-8 shrink-0" />
                  <span className="font-mono text-[13px] text-pink-700">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-ink sm:text-xl">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-soft">
                  {text}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Texto de verdad sobre el market: es lo que le permite a Google
          entender de qué trata la página y mostrarla cuando alguien busca
          el nombre o "bazar kawaii". */}
      <section className="bg-pink-50/60 px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-2xl font-bold leading-[1.15] text-ink sm:text-[30px]">
            Qué es {EVENT_CONFIG.name}
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.7] text-ink-soft">
            {EVENT_CONFIG.name} es un mercado de estética kawaii
            {where ? ` que se realiza en ${where}` : ""}. En cada edición se
            reúnen expositores independientes de ropa y accesorios, arte e
            ilustración, manualidades, papelería y stickers, juguetes y
            coleccionables, belleza y comida, en un ambiente pensado para pasar
            el día entre cosas bonitas.
          </p>
          <p className="mt-3 text-[15.5px] leading-[1.7] text-ink-soft">
            Además de los stands hay concursos y dinámicas: dance cover,
            concurso de cosplay y torneos de cartas coleccionables, con
            convocatorias abiertas a cualquier persona.
          </p>
          {nextEvent && (
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-[15px] leading-[1.6] text-ink">
              <strong>Próxima edición:</strong> {nextEvent.name} ·{" "}
              {formatEventDates(nextEvent.date_start, nextEvent.date_end)}
              {where ? ` · ${where}` : ""}
            </p>
          )}

          <h2 className="mt-10 font-heading text-2xl font-bold leading-[1.15] text-ink sm:text-[30px]">
            Preguntas frecuentes
          </h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-5">
                <h3 className="font-heading text-[16.5px] font-bold leading-[1.35] text-ink">
                  {faq.question}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.65] text-ink-soft">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 pt-14">
        <Card className="mx-auto max-w-3xl border-lavender-300 bg-lavender-100/60 p-8 text-center">
          <Character name="conejita" size={112} className="mx-auto" />
          <h2 className="mt-1 font-heading text-2xl font-bold leading-[1.15] text-ink">
            ¿Dudas sobre tu registro?
          </h2>
          <p className="mt-2 text-base leading-[1.65] text-ink-soft">
            Escríbenos a{" "}
            <a
              className="font-bold text-pink-700 underline underline-offset-2"
              href={`mailto:${EVENT_CONFIG.contactEmail}`}
            >
              {EVENT_CONFIG.contactEmail}
            </a>{" "}
            y con gusto te ayudamos.
          </p>
        </Card>
      </section>
    </main>
  );
}
