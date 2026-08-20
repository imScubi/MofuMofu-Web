"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { StandMap } from "@/components/StandMap";
import { ReglamentoStep } from "@/components/ReglamentoStep";
import { ConfirmationTicket } from "@/components/ConfirmationTicket";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  BUSINESS_CATEGORIES,
  EVENT_CONFIG,
  SHARED_PLAN_NOTICE,
  STAND_INCLUDES,
  eventVenue,
  type PricingPlan,
} from "@/lib/eventConfig";
import { eventDays, formatDayLong } from "@/lib/eventDays";
import { formatEventDates } from "@/lib/formatDates";
import {
  fileInputClass,
  formErrorBoxClass,
  helpClass,
  inputClass,
  labelClass,
} from "@/lib/formClasses";
import {
  availabilityForPlan,
  isStandAllowed,
  occupiedStandIds,
  plansForEvent,
  standRejectionReason,
  zonesForPlan,
} from "@/lib/zones";
import { DirectUploadError, uploadDirect } from "@/lib/uploadDirect";
import type { EventRow, EventStandRow, EventZoneRow } from "@/lib/types";

interface RegistrationFormProps {
  events: EventRow[];
  standsByEvent: Record<string, EventStandRow[]>;
  /** Zonas por edición: qué lugares le tocan a cada plan. */
  zonesByEvent: Record<string, EventZoneRow[]>;
}

type Step = "event" | "map" | "info" | "reglamento" | "payment" | "done";

// Nota: el formulario NO usa el atributo HTML `required`. Varios pasos
// viven en el mismo <form> (los pasos anteriores solo se ocultan con
// CSS para no perder sus datos), y un campo "requerido" oculto puede
// hacer que el navegador bloquee el envío sin mostrar ningún error
// visible. Toda la validación se hace a mano en JS, con mensajes
// explícitos, para evitar ese silencio.

export function RegistrationForm({
  events,
  standsByEvent,
  zonesByEvent,
}: RegistrationFormProps) {
  const [step, setStep] = useState<Step>(events.length === 1 ? "map" : "event");
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(
    events.length === 1 ? events[0] : null
  );
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Subir tres archivos por datos móviles tarda; decir cuál va
  // evita que parezca colgado.
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<number | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [otherSocial, setOtherSocial] = useState("");
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [productDetails, setProductDetails] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [participationDay, setParticipationDay] = useState("");
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

  // Con un plan de un solo día y una edición de varios, hay que saber
  // cuál: el plan logístico del evento se arma por día y el mismo stand
  // puede tener otro negocio al día siguiente.
  const days = selectedEvent
    ? eventDays(selectedEvent.date_start, selectedEvent.date_end)
    : [];

  // Los planes salen de la edición: a los seis de siempre se suman los
  // que el organizador haya definido sólo para ésta.
  const plans = selectedEvent ? plansForEvent(selectedEvent.extra_plans) : [];
  const zones = selectedEvent ? (zonesByEvent[selectedEvent.id] ?? []) : [];
  // El cupo de una zona se cuenta con los lugares que ya son de alguien,
  // que es justo lo que el mapa muestra apartado o en proceso.
  const occupied = occupiedStandIds(eventStands);

  // Qué lugares admite el plan elegido. Se calcula con las mismas
  // reglas que aplica el servidor al reservar, así el mapa nunca ofrece
  // un lugar que después va a rebotar.
  const zoneRules = selectedPlan
    ? availabilityForPlan(zones, selectedPlan.id, occupied)
    : null;

  // Un aviso antes del plano vale más que descubrir a base de tocar
  // cuáles son los lugares con candado.
  const planZones = selectedPlan ? zonesForPlan(zones, selectedPlan.id) : [];
  const zoneNotice =
    selectedPlan && planZones.length > 0
      ? `Con el plan ${selectedPlan.categoryLabel} sólo puedes apartar lugares de ${planZones
          .map((zone) => zone.label)
          .join(" o ")}.`
      : null;
  // Si no queda ni un lugar, invitar a "tocar un espacio verde" es
  // mandar a buscar algo que no está en el plano.
  const hasFreeStand = eventStands.some(
    (stand) =>
      stand.status === "available" && isStandAllowed(zoneRules, stand.stand_id)
  );

  const needsDayChoice = Boolean(selectedPlan && selectedPlan.days === 1 && days.length > 1);

  // Con una sola edición nunca existe el paso de elegirla: mostrarlo
  // dejaría un paso "completado" al que nadie puede volver.
  const visibleSteps =
    events.length === 1 ? STEP_LABELS.filter((s) => s.key !== "event") : STEP_LABELS;

  // El error del paso de pago queda debajo de un formulario largo: si no
  // se trae a la vista, el envío fallido se siente como "no pasó nada".
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  function handleSelectEvent(event: EventRow) {
    setSelectedEvent(event);
    setSelectedStandId(null);
    setSelectedPlan(null);
    setParticipationDay("");
    setReglamentoAccepted(false);
    setGirosAccepted(false);
    setStep("map");
  }

  function handleSelectPlan(plan: PricingPlan) {
    setSelectedPlan(plan);
    // Cambiar de plan puede dejar el lugar elegido fuera de zona. Sólo
    // se suelta cuando de verdad dejó de valer: obligar a volver a
    // buscarlo en el plano cuando sigue siendo válido sería castigar
    // por cambiar de opinión.
    if (
      selectedStandId &&
      standRejectionReason(zones, plan.id, selectedStandId, occupied)
    ) {
      setSelectedStandId(null);
    }
    // El día que participa depende del plan: uno de dos días no lo pide.
    if (plan.days !== 1) setParticipationDay("");
  }

  function handleContinueToPayment() {
    if (!businessName.trim() || !contactName.trim() || !phone.trim()) {
      setInfoError("Completa nombre del negocio, contacto y teléfono para continuar.");
      return;
    }
    // El correo es opcional, pero si lo escriben mal el servidor lo
    // rechaza al final de todo — mejor atrapar la errata aquí.
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setInfoError("Ese correo no se ve bien. Revísalo o déjalo en blanco.");
      return;
    }
    if (!productDetails.trim()) {
      setInfoError("Describe qué productos vas a vender en tu stand.");
      return;
    }
    if (!logo) {
      setInfoError("Sube el logo de tu negocio.");
      return;
    }
    if (needsDayChoice && !participationDay) {
      setInfoError("Elige el día en el que vas a participar.");
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

    // Los archivos van directo a Storage antes del formulario: la
    // plataforma rechaza cualquier POST de más de 4.5 MB, y logo más
    // dos comprobantes pasaban de ahí sin esfuerzo.
    let logoPath: string;
    let proofPath: string;
    let proofPath2: string | null = null;
    try {
      setUploading("logo");
      logoPath = await uploadDirect("logo", selectedStandId, logo!);
      setUploading("comprobante");
      proofPath = await uploadDirect("comprobante", selectedStandId, paymentProof);
      if (paymentProof2) {
        setUploading("comprobante-2");
        proofPath2 = await uploadDirect(
          "comprobante-2",
          selectedStandId,
          paymentProof2
        );
      }
    } catch (err) {
      setError(
        err instanceof DirectUploadError
          ? err.message
          : "No pudimos subir tus archivos. Revisa tu conexión e intenta de nuevo."
      );
      setSubmitting(false);
      setUploading(null);
      return;
    } finally {
      setUploading(null);
    }

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
    formData.set("otherSocial", otherSocial.trim());
    formData.set("businessCategory", businessCategory);
    formData.set("productDetails", productDetails.trim());
    formData.set("participationDay", participationDay);
    formData.set("logoPath", logoPath);
    formData.set("needsElectricity", String(needsElectricity));
    formData.set("electricityDetails", electricityDetails.trim());
    formData.set("needsGas", String(needsGas));
    formData.set("gasDetails", gasDetails.trim());
    formData.set("amountReported", String(amount));
    formData.set("reglamentoAccepted", String(reglamentoAccepted));
    formData.set("restrictedGirosAccepted", String(girosAccepted));
    formData.set("paymentProofPath", proofPath);
    if (proofPath2) formData.set("paymentProofPath2", proofPath2);

    // Sin timeout, si el servidor se queda colgado el botón se queda en
    // "Enviando..." para siempre y parece que no pasó nada.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      // Si el servidor devuelve HTML (p. ej. una página de error), res.json()
      // truena y perderíamos la causa: leemos texto y luego intentamos parsear.
      const raw = await res.text();
      let data: {
        code?: string;
        message?: string;
        detail?: string;
        folio_number?: number;
      } = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.code === "STAND_UNAVAILABLE") {
          setError(
            "Ese stand acaba de ser apartado por alguien más. Elige otro en el mapa."
          );
          setSelectedStandId(null);
          setStep("map");
        } else {
          const base =
            data.message || "No pudimos completar tu registro. Intenta de nuevo.";
          const detail = data.detail || (!raw.trim().startsWith("{") ? raw.slice(0, 200) : "");
          setError(`${base} (error ${res.status}${detail ? `: ${detail}` : ""})`);
        }
        return;
      }

      if (typeof data.folio_number !== "number") {
        setError(
          `El registro se envió pero el servidor no devolvió folio (error ${res.status}). Contáctanos antes de intentar de nuevo para no duplicar tu lugar.`
        );
        return;
      }

      setFolio(data.folio_number);
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "El servidor tardó demasiado en responder. Revisa tu conexión e intenta de nuevo."
          : "Ocurrió un error de conexión. Intenta de nuevo."
      );
    } finally {
      clearTimeout(timeout);
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
      {/* Los pasos ya recorridos funcionan como botones: es el camino de
          regreso que la gente busca primero, antes que el botón "Atrás". */}
      <Steps steps={visibleSteps} current={step} onGo={setStep} />

      {step === "event" && (
        <Card className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                Elige la edición del evento
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Cada edición tiene sus propias fechas y su propio mapa de stands.
              </p>
            </div>
            <Character name="hanzo" size={104} className="hidden shrink-0 sm:block" />
          </div>
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
                {eventVenue(event).line && (
                  <p className="mt-1 text-xs text-ink-soft">
                    📍 {eventVenue(event).line}
                  </p>
                )}
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
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xl font-bold text-ink">
                Elige tu plan y tu lugar
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {selectedEvent.name} ·{" "}
                {formatEventDates(selectedEvent.date_start, selectedEvent.date_end)}
                {eventVenue(selectedEvent).line
                  ? ` · ${eventVenue(selectedEvent).line}`
                  : ""}
              </p>
            </div>
            <Character name="nyxie" size={109} className="hidden shrink-0 sm:block" />
          </div>

          {/* El plan va antes que el mapa: cuando la edición tiene zonas
              es el plan el que decide qué lugares se pueden apartar, y
              ofrecer el plano completo primero sólo lleva a elegir un
              stand que después rebota. */}
          <div className="mt-5">
            <h3 className="font-heading text-lg font-bold text-ink">
              1. Elige tu plan
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Incluye: {STAND_INCLUDES.join(" · ")}.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlan?.id === plan.id}
                  onSelect={() => handleSelectPlan(plan)}
                />
              ))}
            </div>
            {selectedPlan?.shared && (
              <p className="mt-3 rounded-2xl bg-lavender-100/60 px-4 py-2.5 text-sm text-ink-soft">
                {SHARED_PLAN_NOTICE}
              </p>
            )}
          </div>

          <div className="mt-7">
            <h3 className="font-heading text-lg font-bold text-ink">
              2. Elige tu lugar en el mapa
            </h3>

            {!selectedPlan ? (
              <p className="mt-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
                Primero elige tu plan: de eso depende qué lugares te tocan.
              </p>
            ) : (
              <>
                {zoneNotice && (
                  <p className="mt-2 rounded-2xl bg-lavender-100/60 px-4 py-2.5 text-sm text-ink-soft">
                    {zoneNotice}
                  </p>
                )}
                {zoneRules?.fullZones.map((zone) => (
                  <p
                    key={zone.label}
                    className="mt-2 rounded-2xl bg-amber-100/70 px-4 py-2.5 text-sm text-ink-soft"
                  >
                    {zone.reason} Escríbenos si quieres quedar en lista de espera.
                  </p>
                ))}
                <p className="mt-2 text-sm text-ink-soft">
                  {hasFreeStand
                    ? "Toca un espacio disponible (verde menta) para seleccionarlo."
                    : "Ahora mismo no queda ningún lugar libre para este plan. Prueba con otro plan o escríbenos."}
                </p>
                <div className="mt-4">
                  <StandMap
                    eventId={selectedEvent.id}
                    initialStands={eventStands}
                    selectedId={selectedStandId}
                    onSelect={(id) => setSelectedStandId(id)}
                    isLocked={(id) => !isStandAllowed(zoneRules, id)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-ink-soft">
              {selectedStandId && selectedPlan
                ? `Stand #${selectedStandId} · ${selectedPlan.categoryLabel} (${selectedPlan.days} ${
                    selectedPlan.days === 1 ? "día" : "días"
                  }) · $${selectedPlan.price.toLocaleString("es-MX")} ${EVENT_CONFIG.currency}`
                : selectedPlan
                  ? "Elige tu lugar en el mapa para continuar"
                  : "Aún no has elegido tu plan"}
            </span>
            <div className="flex items-center justify-between gap-3">
              {events.length > 1 && (
                <Button type="button" variant="ghost" onClick={() => setStep("event")}>
                  ← Cambiar edición
                </Button>
              )}
              <Button
                type="button"
                disabled={!selectedStandId || !selectedPlan}
                onClick={() => setStep("info")}
              >
                Continuar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {(step === "info" || step === "reglamento" || step === "payment") && (
        <form onSubmit={handleSubmit}>
          <div className={step === "info" ? "" : "hidden"}>
            <Card className="mt-6 space-y-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-xl font-bold text-ink">
                  Cuéntanos de tu negocio
                </h2>
                <Character name="mimirosa" size={104} className="hidden shrink-0 sm:block" />
              </div>

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

              {/* Las redes son opcionales y siempre lo fueron, pero tres
                  campos vacíos a media pantalla se leen como obligatorios.
                  Plegadas, quien las tiene las abre y quien no, sigue. */}
              <div>
                {socialsOpen ? (
                  <div className="rounded-2xl border-2 border-pink-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={labelClass}>
                        Redes sociales del negocio (opcional)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSocialsOpen(false)}
                        className="text-xs font-bold text-ink-soft underline underline-offset-2 hover:text-pink-700"
                      >
                        Ocultar
                      </button>
                    </div>
                    <p className={helpClass}>
                      Las usamos para etiquetarte cuando promocionemos el market.
                      Pon las que tengas y deja en blanco las demás.
                    </p>
                    <div className="mt-3 grid gap-5 sm:grid-cols-3">
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
                    <div className="mt-5">
                      <Field
                        label="Otra red (opcional)"
                        placeholder="Threads, X, tu página web…"
                        value={otherSocial}
                        onChange={(e) => setOtherSocial(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSocialsOpen(true)}
                    className="rounded-2xl border-2 border-dashed border-pink-100 px-4 py-3 text-sm font-bold text-pink-700 transition-colors hover:border-pink-300 hover:bg-pink-50"
                  >
                    + Agregar mis redes sociales{" "}
                    <span className="font-normal text-ink-soft">(opcional)</span>
                  </button>
                )}
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

              {/* La categoría de arriba es demasiado amplia para saber si un
                  negocio cae en un giro restringido o se repite con otro
                  expositor, así que además pedimos el detalle a mano. */}
              <div>
                <label className={labelClass} htmlFor="productDetails">
                  ¿Qué vendes exactamente?<span className="text-pink-600"> *</span>
                </label>
                <textarea
                  id="productDetails"
                  value={productDetails}
                  onChange={(e) => setProductDetails(e.target.value)}
                  placeholder="Ejemplo: aretes y collares de resina hechos a mano. O: crepas dulces, café frío y limonadas."
                  className={inputClass}
                  rows={3}
                  maxLength={300}
                />
                <p className={helpClass}>
                  Escribe los productos concretos que vas a llevar, aunque ya
                  hayas elegido una categoría arriba.
                </p>
              </div>

              {/* El logo va al plan logístico y al mapa que recibe la
                  sede: con logo, el staff ubica cada stand de un vistazo
                  en vez de leer 40 nombres. */}
              <div>
                <label className={labelClass} htmlFor="logo">
                  Logo de tu negocio<span className="text-pink-600"> *</span>
                </label>
                <input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange(setLogo)}
                  className={fileInputClass}
                />
                <p className={helpClass}>
                  PNG, JPG, WEBP o SVG, máximo 4MB. Se usa en el mapa del
                  evento y en tu espacio, para identificar tu stand.
                </p>
                {logo && (
                  <p className="mt-1.5 text-[13px] font-semibold text-mint-500">
                    Listo: {logo.name}
                  </p>
                )}
              </div>

              {needsDayChoice && (
                <div>
                  <label className={labelClass}>
                    ¿Qué día vas a participar?
                    <span className="text-pink-600"> *</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {days.map((day) => {
                      const selected = participationDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setParticipationDay(day)}
                          aria-pressed={selected}
                          className={`min-h-[44px] rounded-full border-2 px-5 text-[15px] font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60 ${
                            selected
                              ? "border-pink-600 bg-pink-500 text-white shadow-[0_2px_0_0_var(--color-pink-700)]"
                              : "border-pink-100 bg-white text-ink-soft hover:border-pink-300"
                          }`}
                        >
                          {formatDayLong(day)}
                        </button>
                      );
                    })}
                  </div>
                  <p className={helpClass}>
                    Tu plan es de un día. Elige cuál para acomodarte en el mapa
                    de ese día.
                  </p>
                </div>
              )}

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
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-2xl font-bold leading-[1.15] text-ink">
                  Confirma tu pago
                </h2>
                <Character name="mofu" size={106} className="hidden shrink-0 sm:block" />
              </div>

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

              {error && (
                <p ref={errorRef} role="alert" className={formErrorBoxClass}>
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep("reglamento")}>
                  ← Atrás
                </Button>
                <Button type="submit" size="lg" disabled={submitting}>
                  {uploading
                    ? `Subiendo ${uploading === "logo" ? "tu logo" : "tu comprobante"}...`
                    : submitting
                      ? "Enviando..."
                      : "Confirmar registro"}
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

interface StepLabel {
  key: Step;
  label: string;
}

const STEP_LABELS: StepLabel[] = [
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
 *
 * Los pasos ya completados son botones: tocarlos regresa a ese paso sin
 * perder nada de lo capturado. Los pasos que aún no se llegan no lo son,
 * porque saltar adelante dejaría datos obligatorios sin llenar.
 */
function Steps({
  steps,
  current,
  onGo,
}: {
  steps: StepLabel[];
  current: Step;
  onGo: (step: Step) => void;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);
  const currentLabel = steps[currentIndex]?.label ?? "";

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-2.5">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const navigable = done;

          const marker = (
            <>
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
                  active ? "font-extrabold text-pink-700" : "font-semibold text-ink-soft",
                  navigable && "underline decoration-mint-500 decoration-2 underline-offset-4"
                )}
              >
                {s.label}
              </span>
            </>
          );

          return (
            <div key={s.key} className="flex flex-1 items-center gap-2 last:flex-none">
              {navigable ? (
                <button
                  type="button"
                  onClick={() => onGo(s.key)}
                  aria-label={`Volver al paso ${i + 1}: ${s.label}`}
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60"
                >
                  {marker}
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">{marker}</div>
              )}
              {i < steps.length - 1 && (
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
        Paso {currentIndex + 1} de {steps.length} ·{" "}
        <span className="text-pink-700">{currentLabel}</span>
      </p>
      {currentIndex > 0 && (
        <p className="mt-1 text-[13px] text-ink-soft sm:hidden">
          Toca un paso verde para regresar.
        </p>
      )}
    </div>
  );
}
