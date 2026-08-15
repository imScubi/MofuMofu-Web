"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import clsx from "clsx";
import { StandMap } from "@/components/StandMap";
import { ReglamentoStep } from "@/components/ReglamentoStep";
import { ConfirmationTicket } from "@/components/ConfirmationTicket";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  BUSINESS_CATEGORIES,
  EVENT_CONFIG,
  PRICING_PLANS,
  SHARED_PLAN_NOTICE,
  STAND_INCLUDES,
  type PricingPlan,
} from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import {
  fileInputClass,
  formErrorBoxClass,
  inputClass,
  labelClass,
} from "@/lib/formClasses";
import type { EventRow, EventStandRow } from "@/lib/types";

interface RegistrationFormProps {
  events: EventRow[];
  standsByEvent: Record<string, EventStandRow[]>;
}

type Step = "event" | "map" | "info" | "reglamento" | "payment" | "done";

// Nota: el formulario NO usa el atributo HTML `required`. Varios pasos
// viven en el mismo <form> (los pasos anteriores solo se ocultan con
// CSS para no perder sus datos), y un campo "requerido" oculto puede
// hacer que el navegador bloquee el envío sin mostrar ningún error
// visible. Toda la validación se hace a mano en JS, con mensajes
// explícitos, para evitar ese silencio.

export function RegistrationForm({ events, standsByEvent }: RegistrationFormProps) {
  const [step, setStep] = useState<Step>(events.length === 1 ? "map" : "event");
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(
    events.length === 1 ? events[0] : null
  );
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<number | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [needsElectricity, setNeedsElectricity] = useState(false);
  const [electricityDetails, setElectricityDetails] = useState("");
  const [needsGas, setNeedsGas] = useState(false);
  const [gasDetails, setGasDetails] = useState("");
  const [infoError, setInfoError] = useState<string | null>(null);

  const [reglamentoAccepted, setReglamentoAccepted] = useState(false);
  const [girosAccepted, setGirosAccepted] = useState(false);
  const [reglamentoError, setReglamentoError] = useState<string | null>(null);

  const [amountReported, setAmountReported] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProof2, setPaymentProof2] = useState<File | null>(null);

  const eventStands = selectedEvent ? (standsByEvent[selectedEvent.id] ?? []) : [];

  function handleSelectEvent(event: EventRow) {
    setSelectedEvent(event);
    setSelectedStandId(null);
    setSelectedPlan(null);
    setReglamentoAccepted(false);
    setGirosAccepted(false);
    setStep("map");
  }

  function handleContinueToPayment() {
    if (!businessName.trim() || !contactName.trim() || !phone.trim()) {
      setInfoError("Completa nombre del negocio, contacto y teléfono para continuar.");
      return;
    }
    if (needsElectricity && !electricityDetails.trim()) {
      setInfoError("Describe qué necesitas conectar de electricidad.");
      return;
    }
    setInfoError(null);
    setStep("reglamento");
  }

  function handleContinueFromReglamento() {
    if (!reglamentoAccepted) {
      setReglamentoError("Debes leer y aceptar el reglamento para continuar.");
      return;
    }
    if (selectedEvent?.restricted_giros_enabled && !girosAccepted) {
      setReglamentoError(
        "Debes aceptar la cláusula sobre los giros restringidos para continuar."
      );
      return;
    }
    setReglamentoError(null);
    setAmountReported((prev) => prev || String(selectedPlan?.price ?? ""));
    setStep("payment");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent || !selectedStandId || !selectedPlan) return;

    const amount = Number(amountReported);
    if (!amountReported || Number.isNaN(amount) || amount < 0) {
      setError("Ingresa el monto que transferiste.");
      return;
    }
    if (!paymentProof) {
      setError("Debes adjuntar la captura de tu transferencia.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("eventId", selectedEvent.id);
    formData.set("standId", selectedStandId);
    formData.set("planId", selectedPlan.id);
    formData.set("businessName", businessName.trim());
    formData.set("contactName", contactName.trim());
    formData.set("phone", phone.trim());
    formData.set("email", email.trim());
    formData.set("instagram", instagram.trim());
    formData.set("facebook", facebook.trim());
    formData.set("tiktok", tiktok.trim());
    formData.set("businessCategory", businessCategory);
    formData.set("needsElectricity", String(needsElectricity));
    formData.set("electricityDetails", electricityDetails.trim());
    formData.set("needsGas", String(needsGas));
    formData.set("gasDetails", gasDetails.trim());
    formData.set("amountReported", String(amount));
    formData.set("reglamentoAccepted", String(reglamentoAccepted));
    formData.set("restrictedGirosAccepted", String(girosAccepted));
    formData.set("paymentProof", paymentProof);
    if (paymentProof2) formData.set("paymentProof2", paymentProof2);

    try {
      const res = await fetch("/api/reserve", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "STAND_UNAVAILABLE") {
          setError(
            "Ese stand acaba de ser apartado por alguien más. Elige otro en el mapa."
          );
          setSelectedStandId(null);
          setStep("map");
        } else {
          setError(data.message || "No pudimos completar tu registro. Intenta de nuevo.");
        }
        return;
      }

      setFolio(data.folio_number);
      setStep("done");
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(setter: (file: File | null) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => setter(e.target.files?.[0] ?? null);
  }

  if (step === "done") {
    return (
      <ConfirmationTicket
        folio={folio}
        standId={selectedStandId}
        event={selectedEvent}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Steps current={step} />

      {step === "event" && (
        <Card className="mt-6 p-6">
          <h2 className="font-heading text-xl font-bold text-ink">
            1. Elige la edición del evento
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Cada edición tiene sus propias fechas y su propio mapa de stands.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleSelectEvent(event)}
                className="rounded-2xl border-2 border-pink-100 bg-white p-4 text-left transition-colors hover:border-pink-300"
              >
                <p className="font-heading font-semibold text-ink">{event.name}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatEventDates(event.date_start, event.date_end)}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Límite de pago:{" "}
                  {new Date(event.payment_deadline + "T00:00:00").toLocaleDateString(
                    "es-MX",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === "map" && selectedEvent && (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-xl font-bold text-ink">
              2. Elige tu stand en el mapa
            </h2>
            {events.length > 1 && (
              <button
                type="button"
                onClick={() => setStep("event")}
                className="text-sm text-pink-600 underline"
              >
                Cambiar edición
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {selectedEvent.name} ·{" "}
            {formatEventDates(selectedEvent.date_start, selectedEvent.date_end)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Toca un espacio disponible (verde menta) para seleccionarlo.
          </p>
          <div className="mt-4">
            <StandMap
              eventId={selectedEvent.id}
              initialStands={eventStands}
              selectedId={selectedStandId}
              onSelect={(id) => setSelectedStandId(id)}
            />
          </div>

          {selectedStandId && (
            <div className="mt-6">
              <h3 className="font-heading text-lg font-bold text-ink">
                Elige tu plan para el stand #{selectedStandId}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Incluye: {STAND_INCLUDES.join(" · ")}.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PRICING_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan?.id === plan.id}
                    onSelect={() => setSelectedPlan(plan)}
                  />
                ))}
              </div>
              {selectedPlan?.shared && (
                <p className="mt-3 rounded-2xl bg-lavender-100/60 px-4 py-2.5 text-sm text-ink-soft">
                  {SHARED_PLAN_NOTICE}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-ink-soft">
              {selectedStandId && selectedPlan
                ? `Stand #${selectedStandId} · ${selectedPlan.categoryLabel} (${selectedPlan.days} ${
                    selectedPlan.days === 1 ? "día" : "días"
                  }) · $${selectedPlan.price.toLocaleString("es-MX")} ${EVENT_CONFIG.currency}`
                : selectedStandId
                  ? "Elige un plan para continuar"
                  : "Aún no has elegido un stand"}
            </span>
            <Button
              disabled={!selectedStandId || !selectedPlan}
              onClick={() => setStep("info")}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {(step === "info" || step === "reglamento" || step === "payment") && (
        <form onSubmit={handleSubmit}>
          <div className={step === "info" ? "" : "hidden"}>
            <Card className="mt-6 space-y-5 p-6">
              <h2 className="font-heading text-xl font-bold text-ink">
                3. Cuéntanos de tu negocio
              </h2>

              <Field
                label="Nombre del negocio"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Nombre de contacto"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Field
                  label="Teléfono / WhatsApp"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Field
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="grid gap-5 sm:grid-cols-3">
                <Field
                  label="Instagram"
                  placeholder="@usuario"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <Field
                  label="Facebook"
                  placeholder="usuario o link"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
                <Field
                  label="TikTok"
                  placeholder="@usuario"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Giro del negocio</label>
                <select
                  className={inputClass}
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Checkbox
                  checked={needsElectricity}
                  onChange={(e) => setNeedsElectricity(e.target.checked)}
                >
                  Necesito electricidad para mi stand
                </Checkbox>
                {needsElectricity && (
                  <textarea
                    value={electricityDetails}
                    onChange={(e) => setElectricityDetails(e.target.value)}
                    placeholder="Describe con detalle qué vas a conectar: cuántos focos/luces, si llevas laptop, plancha, cafetera, freidora, refrigerador, etc., y cuánto tiempo estará encendido cada aparato."
                    className={`${inputClass} mt-2`}
                    rows={3}
                  />
                )}
              </div>

              <div>
                <Checkbox
                  checked={needsGas}
                  onChange={(e) => setNeedsGas(e.target.checked)}
                >
                  Necesito gas para mi stand
                </Checkbox>
                {needsGas && (
                  <textarea
                    value={gasDetails}
                    onChange={(e) => setGasDetails(e.target.value)}
                    placeholder="Cuéntanos qué tipo de equipo usarás (parrilla, tanque, etc.)"
                    className={`${inputClass} mt-2`}
                    rows={2}
                  />
                )}
              </div>

              {infoError && (
                <p className={formErrorBoxClass}>
                  {infoError}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep("map")}>
                  ← Atrás
                </Button>
                <Button type="button" onClick={handleContinueToPayment}>
                  Continuar
                </Button>
              </div>
            </Card>
          </div>

          <div className={step === "reglamento" ? "" : "hidden"}>
            <ReglamentoStep
              showRestrictedGiros={selectedEvent?.restricted_giros_enabled ?? false}
              reglamentoAccepted={reglamentoAccepted}
              onReglamentoAcceptedChange={setReglamentoAccepted}
              girosAccepted={girosAccepted}
              onGirosAcceptedChange={setGirosAccepted}
            />
            {reglamentoError && (
              <p className={`mt-3 ${formErrorBoxClass}`}>
                {reglamentoError}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep("info")}>
                ← Atrás
              </Button>
              <Button type="button" onClick={handleContinueFromReglamento}>
                Acepto y continuar
              </Button>
            </div>
          </div>

          <div className={step === "payment" ? "" : "hidden"}>
            <Card tone="pago" className="mt-6 space-y-5 p-5 sm:p-8">
              <h2 className="font-heading text-2xl font-bold leading-[1.15] text-ink">
                Confirma tu pago
              </h2>

              <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
                {/* El monto es lo primero y lo más grande: nadie debe
                    transferir de menos por no verlo. */}
                <div className="rounded-2xl bg-pink-50 p-4">
                  <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                    Monto a transferir
                  </p>
                  <p className="mt-1 font-mono text-[34px] font-medium leading-none text-ink">
                    ${selectedPlan?.price.toLocaleString("es-MX")}
                    <span className="ml-1.5 font-body text-sm font-bold text-ink-soft">
                      {EVENT_CONFIG.currency}
                    </span>
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.5] text-ink-soft">
                    Stand <strong className="text-ink">#{selectedStandId}</strong> ·{" "}
                    {selectedPlan?.categoryLabel} · {selectedPlan?.days}{" "}
                    {selectedPlan?.days === 1 ? "día" : "días"}
                  </p>
                </div>

                <div className="rounded-2xl bg-lavender-100/70 p-4">
                  <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-lavender-500">
                    Datos para transferir
                  </p>
                  <dl className="mt-2 space-y-2">
                    <BankRow label="Banco" value={EVENT_CONFIG.bankInfo.bank} />
                    <BankRow label="Titular" value={EVENT_CONFIG.bankInfo.accountHolder} />
                    <BankRow label="CLABE" value={EVENT_CONFIG.bankInfo.clabe} mono copyable />
                    <BankRow
                      label="Tarjeta"
                      value={EVENT_CONFIG.bankInfo.cardNumber}
                      mono
                      copyable
                    />
                    <BankRow label="Concepto" value={EVENT_CONFIG.bankInfo.concept} />
                  </dl>
                </div>
              </div>

              <Field
                label={`Monto que transferiste (${EVENT_CONFIG.currency})`}
                type="number"
                min={0}
                step="0.01"
                required
                value={amountReported}
                onChange={(e) => setAmountReported(e.target.value)}
              />

              <div>
                <label className={labelClass}>
                  Captura de tu transferencia<span className="text-pink-600"> *</span>
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange(setPaymentProof)}
                  className={fileInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Segunda captura (opcional, si hiciste 2 pagos)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange(setPaymentProof2)}
                  className={fileInputClass}
                />
              </div>

              <p className="rounded-2xl bg-mint-100/70 px-4 py-3 text-[13.5px] leading-[1.55] text-ink-soft">
                Tu comprobante lo revisa una persona del staff a mano. Sólo lo
                usamos para confirmar tu pago y no se comparte con nadie más.
              </p>

              {error && <p className={formErrorBoxClass}>{error}</p>}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep("reglamento")}>
                  ← Atrás
                </Button>
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? "Enviando..." : "Confirmar registro"}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}

/** Fila etiqueta/valor de los datos bancarios, con copiar en un toque. */
function BankRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El valor sigue visible aunque el portapapeles falle.
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
          {label}
        </dt>
        <dd
          className={clsx(
            "break-words text-[14px] text-ink",
            mono ? "font-mono" : "font-semibold"
          )}
        >
          {value}
        </dd>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lavender-500 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-300"
        >
          {copied ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3.2 8.6l3 3L12.8 5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <rect
                x="5.5"
                y="5.5"
                width="7.5"
                height="8.5"
                rx="1.8"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path
                d="M10.2 3.5H4.8c-.9 0-1.6.7-1.6 1.6v5.3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "relative rounded-[20px] border-2 p-[18px] text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60",
        selected
          ? "border-pink-600 bg-pink-50 ring-4 ring-pink-100 shadow-[0_2px_0_0_var(--color-pink-300)]"
          : "border-pink-100 bg-white hover:-translate-y-0.5 hover:border-pink-300"
      )}
    >
      {/* La selección no depende sólo del color: aparece una etiqueta. */}
      {selected && (
        <span className="absolute -top-[11px] right-3.5 inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-2.5 py-1 text-[11px] font-bold text-white">
          <svg viewBox="0 0 16 16" fill="none" className="h-[11px] w-[11px]" aria-hidden="true">
            <path
              d="M3.2 8.6l3 3L12.8 5"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Elegido
        </span>
      )}
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-heading text-base font-bold text-ink">
          {plan.categoryLabel}
        </span>
        {plan.shared && (
          <span className="shrink-0 rounded-full bg-lavender-100 px-2.5 py-0.5 text-[11px] font-bold text-lavender-500">
            Compartido
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[13.5px] text-ink-soft">
        {plan.days === 1 ? "1 día" : "2 días"}
      </p>
      <p className="mt-2 font-mono text-[21px] font-medium text-pink-700">
        ${plan.price.toLocaleString("es-MX")}{" "}
        <span className="font-body text-xs font-bold">{EVENT_CONFIG.currency}</span>
      </p>
    </button>
  );
}

function Field({
  label,
  required,
  ...rest
}: {
  label: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="text-pink-600"> *</span>}
      </span>
      <input className={inputClass} {...rest} />
    </label>
  );
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "event", label: "Edición" },
  { key: "map", label: "Stand" },
  { key: "info", label: "Negocio" },
  { key: "reglamento", label: "Reglamento" },
  { key: "payment", label: "Pago" },
];

/**
 * En móvil los cinco pasos con etiqueta no caben en 390px, así que ahí
 * sólo se ven los puntos y una línea con el paso actual; las etiquetas
 * completas aparecen desde 640px.
 */
function Steps({ current }: { current: Step }) {
  const currentIndex = STEP_LABELS.findIndex((s) => s.key === current);
  const currentLabel = STEP_LABELS[currentIndex]?.label ?? "";

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-2.5">
        {STEP_LABELS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2 last:flex-none">
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                    done && "bg-mint-500 text-white",
                    active && "bg-pink-500 text-white ring-4 ring-pink-100",
                    !done && !active && "border-2 border-pink-100 bg-white text-ink-soft"
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" fill="none" className="h-[13px] w-[13px]" aria-hidden="true">
                      <path
                        d="M3.2 8.6l3 3L12.8 5"
                        stroke="currentColor"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={clsx(
                    "hidden text-sm sm:inline",
                    active ? "font-extrabold text-pink-700" : "font-semibold text-ink-soft"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span
                  className={clsx(
                    "h-[3px] flex-1 rounded-full sm:w-7 sm:flex-none",
                    done ? "bg-mint-500" : "bg-pink-100"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-heading text-[15px] font-bold text-ink sm:hidden">
        Paso {currentIndex + 1} de {STEP_LABELS.length} ·{" "}
        <span className="text-pink-700">{currentLabel}</span>
      </p>
    </div>
  );
}
