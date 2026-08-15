"use client";

import { FormEvent, useState } from "react";
import clsx from "clsx";
import { StandMap } from "@/components/StandMap";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BUSINESS_CATEGORIES,
  EVENT_CONFIG,
  PRICING_PLANS,
  SHARED_PLAN_NOTICE,
  STAND_INCLUDES,
  type PricingPlan,
} from "@/lib/eventConfig";
import type { StandRow } from "@/lib/types";

interface RegistrationFormProps {
  initialStands: StandRow[];
}

type Step = "map" | "info" | "payment" | "done";

const inputClass =
  "w-full rounded-2xl border border-pink-100 bg-white px-4 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100";
const labelClass = "text-sm font-semibold text-ink";

export function RegistrationForm({ initialStands }: RegistrationFormProps) {
  const [step, setStep] = useState<Step>("map");
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);

  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [needsElectricity, setNeedsElectricity] = useState(false);
  const [needsGas, setNeedsGas] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStandId || !selectedPlan) return;
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("standId", selectedStandId);
    formData.set("planId", selectedPlan.id);
    formData.set("businessCategory", businessCategory);
    formData.set("needsElectricity", String(needsElectricity));
    formData.set("needsGas", String(needsGas));

    try {
      const res = await fetch("/api/reserve", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "STAND_UNAVAILABLE") {
          setError(
            "Ese stand acaba de ser apartado por alguien más 😿. Elige otro en el mapa."
          );
          setSelectedStandId(null);
          setStep("map");
        } else {
          setError(data.message || "No pudimos completar tu registro. Intenta de nuevo.");
        }
        return;
      }

      setFolio(data.id);
      setStep("done");
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="font-heading mt-3 text-2xl font-bold text-ink">
          ¡Tu registro quedó apartado!
        </h2>
        <p className="mt-2 text-ink-soft">
          Stand <span className="font-bold text-pink-600">#{selectedStandId}</span>{" "}
          reservado. Estamos revisando tu comprobante de pago, te confirmaremos por
          correo o WhatsApp en cuanto quede aprobado.
        </p>
        {folio && (
          <p className="mt-4 rounded-2xl bg-pink-50 px-4 py-2 text-sm text-ink-soft">
            Folio de tu registro:{" "}
            <span className="font-mono font-semibold text-ink">{folio}</span>
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Steps current={step} />

      {step === "map" && (
        <Card className="mt-6 p-6">
          <h2 className="font-heading text-xl font-bold text-ink">
            1. Elige tu stand en el mapa
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Toca un espacio disponible (verde menta) para seleccionarlo.
          </p>
          <div className="mt-4">
            <StandMap
              initialStands={initialStands}
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
                  🤝 {SHARED_PLAN_NOTICE}
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

      {(step === "info" || step === "payment") && (
        <form onSubmit={handleSubmit}>
          <div className={step === "info" ? "" : "hidden"}>
            <Card className="mt-6 space-y-5 p-6">
              <h2 className="font-heading text-xl font-bold text-ink">
                2. Cuéntanos de tu negocio
              </h2>

              <Field label="Nombre del negocio" name="businessName" required />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre de contacto" name="contactName" required />
                <Field label="Teléfono / WhatsApp" name="phone" type="tel" required />
              </div>
              <Field label="Correo electrónico" name="email" type="email" />

              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Instagram" name="instagram" placeholder="@usuario" />
                <Field label="Facebook" name="facebook" placeholder="usuario o link" />
                <Field label="TikTok" name="tiktok" placeholder="@usuario" />
              </div>

              <div>
                <label className={labelClass}>Giro del negocio</label>
                <select
                  className={`${inputClass} mt-1.5`}
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
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={needsElectricity}
                    onChange={(e) => setNeedsElectricity(e.target.checked)}
                    className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300"
                  />
                  Necesito electricidad para mi stand
                </label>
                {needsElectricity && (
                  <textarea
                    name="electricityDetails"
                    required
                    placeholder="Describe con detalle qué vas a conectar: cuántos focos/luces, si llevas laptop, plancha, cafetera, freidora, refrigerador, etc., y cuánto tiempo estará encendido cada aparato."
                    className={`${inputClass} mt-2`}
                    rows={3}
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={needsGas}
                    onChange={(e) => setNeedsGas(e.target.checked)}
                    className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300"
                  />
                  Necesito gas para mi stand
                </label>
                {needsGas && (
                  <textarea
                    name="gasDetails"
                    placeholder="Cuéntanos qué tipo de equipo usarás (parrilla, tanque, etc.)"
                    className={`${inputClass} mt-2`}
                    rows={2}
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep("map")}>
                  ← Atrás
                </Button>
                <Button type="button" onClick={() => setStep("payment")}>
                  Continuar
                </Button>
              </div>
            </Card>
          </div>

          <div className={step === "payment" ? "" : "hidden"}>
            <Card className="mt-6 space-y-5 p-6">
              <h2 className="font-heading text-xl font-bold text-ink">
                3. Confirma tu pago
              </h2>

              <div className="rounded-2xl bg-lavender-100/60 p-4 text-sm">
                <p className="font-semibold text-ink">
                  Stand #{selectedStandId} · {selectedPlan?.categoryLabel} (
                  {selectedPlan?.days} {selectedPlan?.days === 1 ? "día" : "días"}) · $
                  {selectedPlan?.price.toLocaleString("es-MX")} {EVENT_CONFIG.currency}
                </p>
                <div className="mt-2 space-y-0.5 text-ink-soft">
                  <p>Banco: {EVENT_CONFIG.bankInfo.bank}</p>
                  <p>Titular: {EVENT_CONFIG.bankInfo.accountHolder}</p>
                  <p>CLABE: {EVENT_CONFIG.bankInfo.clabe}</p>
                  <p>Concepto sugerido: {EVENT_CONFIG.bankInfo.concept}</p>
                </div>
              </div>

              <Field
                label={`Monto transferido (${EVENT_CONFIG.currency})`}
                name="amountReported"
                type="number"
                defaultValue={selectedPlan?.price}
                min={0}
                step="0.01"
                required
              />

              <div>
                <label className={labelClass}>Captura de tu transferencia</label>
                <input
                  type="file"
                  name="paymentProof"
                  accept="image/*,.pdf"
                  required
                  className={`${inputClass} mt-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-pink-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-pink-600`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Segunda captura (opcional, si hiciste 2 pagos)
                </label>
                <input
                  type="file"
                  name="paymentProof2"
                  accept="image/*,.pdf"
                  className={`${inputClass} mt-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-pink-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-pink-600`}
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep("info")}>
                  ← Atrás
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Confirmar registro 🎀"}
                </Button>
              </div>
            </Card>
          </div>
        </form>
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
      className={clsx(
        "rounded-2xl border-2 p-4 text-left transition-colors",
        selected
          ? "border-pink-500 bg-pink-50"
          : "border-pink-100 bg-white hover:border-pink-300"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading font-semibold text-ink">{plan.categoryLabel}</span>
        {plan.shared && (
          <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-semibold text-lavender-500">
            Compartido
          </span>
        )}
      </div>
      <p className="text-sm text-ink-soft">{plan.days === 1 ? "1 día" : "2 días"}</p>
      <p className="font-heading mt-1 text-xl font-bold text-pink-600">
        ${plan.price.toLocaleString("es-MX")} {EVENT_CONFIG.currency}
      </p>
    </button>
  );
}

function Field({
  label,
  name,
  required,
  ...rest
}: {
  label: string;
  name: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-pink-500"> *</span>}
      </label>
      <input name={name} required={required} className={`${inputClass} mt-1.5`} {...rest} />
    </div>
  );
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "map", label: "Stand" },
  { key: "info", label: "Negocio" },
  { key: "payment", label: "Pago" },
];

function Steps({ current }: { current: Step }) {
  const currentIndex = STEP_LABELS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-3">
      {STEP_LABELS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              i <= currentIndex
                ? "bg-pink-500 text-white"
                : "bg-pink-100 text-ink-soft"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm font-semibold ${
              i <= currentIndex ? "text-ink" : "text-ink-soft"
            }`}
          >
            {s.label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div className="h-px w-8 bg-pink-100 sm:w-16" />
          )}
        </div>
      ))}
    </div>
  );
}
