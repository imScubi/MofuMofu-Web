"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import {
  fileInputClass,
  formErrorBoxClass,
  inputClass,
  labelClass,
} from "@/lib/formClasses";
import { DirectUploadError, uploadDirect } from "@/lib/uploadDirect";


interface RegistrationSummary {
  folioNumber: number;
  standId: string;
  businessName: string;
  planLabel: string;
  planPrice: number;
  amountReported: number;
  status: "pending_review" | "approved" | "rejected";
}

export default function CompletarPagoPage() {
  const [folio, setFolio] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [registration, setRegistration] = useState<RegistrationSummary | null>(null);

  const [additionalAmount, setAdditionalAmount] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ amountReported: number; planPrice: number } | null>(
    null
  );

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!folio.trim() || !phone.trim()) {
      setLookupError("Ingresa tu folio y tu teléfono.");
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const res = await fetch("/api/registration/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folio: folio.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.message || "No pudimos encontrar tu registro.");
        return;
      }
      setRegistration(data);
      setAdditionalAmount("");
    } catch {
      setLookupError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    if (!registration) return;

    const amount = Number(additionalAmount);
    if (!additionalAmount || Number.isNaN(amount) || amount <= 0) {
      setSubmitError("Ingresa el monto de este pago.");
      return;
    }
    if (!proof) {
      setSubmitError("Adjunta la captura de tu transferencia.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Igual que en el registro: el archivo va directo a Storage, porque
    // la plataforma corta cualquier POST de más de 4.5 MB.
    let proofPath: string;
    try {
      proofPath = await uploadDirect("complemento", registration.standId, proof);
    } catch (err) {
      setSubmitError(
        err instanceof DirectUploadError
          ? err.message
          : "No pudimos subir tu comprobante. Revisa tu conexión e intenta de nuevo."
      );
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set("folio", folio.trim());
    formData.set("phone", phone.trim());
    formData.set("additionalAmount", String(amount));
    formData.set("proofPath", proofPath);

    try {
      const res = await fetch("/api/registration/add-payment", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || "No pudimos registrar tu pago. Intenta de nuevo.");
        return;
      }
      setDone({ amountReported: data.amountReported, planPrice: data.planPrice });
    } catch {
      setSubmitError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setProof(e.target.files?.[0] ?? null);
  }

  if (done) {
    return (
      <main className="flex-1 px-4 py-14">
        <Card className="mofu-confetti mx-auto max-w-lg p-8 text-center">
          <Character name="mofu" size={124} className="mx-auto" />
          <h1 className="mt-1 font-heading text-2xl font-bold leading-[1.15] text-ink">
            ¡Pago agregado a tu registro!
          </h1>
          <p className="mt-3 font-mono text-[30px] font-medium leading-none text-pink-700">
            ${done.amountReported.toLocaleString("es-MX")}
            <span className="ml-1.5 font-body text-sm font-bold text-ink-soft">
              de ${done.planPrice.toLocaleString("es-MX")} {EVENT_CONFIG.currency}
            </span>
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.55] text-ink-soft">
            Sigue en el mismo registro, no se creó uno nuevo.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-14">
      <div className="mx-auto mb-8 max-w-lg text-center">
        <Character name="nyxie" size={120} className="mx-auto" priority />
        <h1 className="mt-1 font-heading text-[34px] font-extrabold leading-[1.05] tracking-[-0.01em] text-ink">
          Completar mi pago
        </h1>
        <p className="mt-3 text-base leading-[1.65] text-ink-soft">
          ¿Ya apartaste tu stand y vas a hacer tu segundo pago? Usa tu folio para
          agregarlo a tu mismo registro, sin duplicarlo.
        </p>
      </div>

      {!registration ? (
        <Card className="mx-auto max-w-[420px] p-5 sm:max-w-md sm:p-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className={labelClass}>Folio de tu registro</label>
              <input
                className={`${inputClass} font-mono`}
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                inputMode="numeric"
                placeholder="Ej. 1004"
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono con el que te registraste</label>
              <input
                className={inputClass}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {lookupError && (
              <p className={formErrorBoxClass}>
                {lookupError}
              </p>
            )}
            <Button type="submit" disabled={lookingUp} className="w-full">
              {lookingUp ? "Buscando..." : "Buscar mi registro"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="mx-auto max-w-[420px] p-5 sm:max-w-md sm:p-6">
          <div className="rounded-2xl bg-lavender-100/60 p-4 text-sm">
            <p className="font-semibold text-ink">
              Stand #{registration.standId} · {registration.businessName}
            </p>
            <p className="mt-1 text-ink-soft">{registration.planLabel}</p>
            <p className="mt-2 text-ink-soft">
              Llevas reportado ${registration.amountReported.toLocaleString("es-MX")} de $
              {registration.planPrice.toLocaleString("es-MX")} {EVENT_CONFIG.currency}
            </p>
          </div>

          {registration.status === "rejected" ? (
            <p className={`mt-4 ${formErrorBoxClass}`}>
              Este registro fue rechazado, así que ya no está apartado. Contacta a los
              organizadores en{" "}
              <a href={`mailto:${EVENT_CONFIG.contactEmail}`} className="underline">
                {EVENT_CONFIG.contactEmail}
              </a>
              .
            </p>
          ) : (
            <form onSubmit={handleAddPayment} className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>
                  Monto de este pago ({EVENT_CONFIG.currency})
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Captura de esta transferencia</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className={fileInputClass}
                />
              </div>
              {submitError && (
                <p className={formErrorBoxClass}>
                  {submitError}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Enviando..." : "Agregar este pago"}
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setRegistration(null)}
            className="mt-4 w-full text-center text-sm text-ink-soft underline"
          >
            Buscar otro folio
          </button>
        </Card>
      )}
    </main>
  );
}
