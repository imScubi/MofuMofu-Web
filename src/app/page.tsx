import Link from "next/link";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const steps = [
  {
    emoji: "🗺️",
    title: "Elige tu stand",
    text: "Explora el mapa interactivo y selecciona el espacio que más te guste.",
  },
  {
    emoji: "📝",
    title: "Cuéntanos de tu negocio",
    text: "Comparte tus datos de contacto, redes sociales y necesidades de electricidad o gas.",
  },
  {
    emoji: "💌",
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

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="pointer-events-none absolute -top-10 -left-16 h-56 w-56 rounded-full bg-pink-100 blur-2xl" />
        <div className="pointer-events-none absolute top-24 -right-10 h-64 w-64 rounded-full bg-lavender-100 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-mint-100 blur-2xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-600">
            🎀 Registro de expositores
          </span>
          <h1 className="font-heading mt-6 text-4xl font-bold text-ink sm:text-5xl">
            {EVENT_CONFIG.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
            Aparta tu stand: selecciona tu lugar en el mapa, cuéntanos de tu negocio
            y confirma tu pago en unos minutos.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/registro">
              <Button size="lg">Reservar mi stand ✨</Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            ¿Ya reservaste y vas a completar tu pago?{" "}
            <Link href="/registro/completar" className="font-semibold text-pink-600 underline">
              Completa tu pago aquí
            </Link>
          </p>
        </div>
      </section>

      {events.length > 0 && (
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-heading text-center text-2xl font-bold text-ink">
              Próximas fechas
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="p-5 text-center">
                  <p className="font-heading font-semibold text-ink">{event.name}</p>
                  <p className="mt-1 text-sm text-pink-600">
                    {formatEventDates(event.date_start, event.date_end)}
                  </p>
                  <p className="mt-2 text-xs text-ink-soft">
                    Límite de pago: {formatDate(event.payment_deadline)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="p-6 text-center">
              <div className="text-4xl">{step.emoji}</div>
              <h3 className="font-heading mt-3 text-lg font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <Card className="mx-auto max-w-3xl p-8 text-center bg-lavender-100/60 border-lavender-300">
          <h2 className="font-heading text-2xl font-bold text-ink">
            ¿Dudas sobre tu registro?
          </h2>
          <p className="mt-2 text-ink-soft">
            Escríbenos a{" "}
            <a
              className="font-semibold text-pink-600 underline"
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
