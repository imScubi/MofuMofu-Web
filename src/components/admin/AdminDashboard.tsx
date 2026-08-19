"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { DiscountCell } from "@/components/admin/DiscountCell";
import { DeleteRegistration } from "@/components/admin/DeleteRegistration";
import { discountAmount, finalPrice } from "@/lib/discount";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import { formatDayShort } from "@/lib/eventDays";
import { logoPublicUrl } from "@/lib/logoUrl";
import type {
  EventRow,
  EventStandRow,
  RefundRow,
  RegistrationRow,
  RegistrationStatus,
} from "@/lib/types";

interface AdminDashboardProps {
  events: EventRow[];
  selectedEvent: EventRow;
  initialStands: EventStandRow[];
  initialRegistrations: RegistrationRow[];
  /** Bajas con devolución: el dinero que entró y volvió a salir. */
  initialRefunds: RefundRow[];
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending_review: "bg-amber-100 text-amber-500",
  approved: "bg-mint-100 text-mint-500",
  rejected: "bg-danger-50 text-danger-600",
  cancelled: "bg-gray-200 text-ink-soft",
};

const FILTERS: { key: "all" | RegistrationStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending_review", label: "En revisión" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "cancelled", label: "Cancelados" },
];

export function AdminDashboard({
  events,
  selectedEvent,
  initialStands,
  initialRegistrations,
  initialRefunds,
}: AdminDashboardProps) {
  const router = useRouter();
  const [stands, setStands] = useState(initialStands);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [filter, setFilter] = useState<"all" | RegistrationStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Sincroniza el estado local cuando el servidor manda props nuevas
  // (tras un router.refresh()). Se ajusta durante el render, no en un
  // efecto, siguiendo el patrón recomendado por React para derivar
  // estado de props sin renders en cascada.
  const [syncedRegistrations, setSyncedRegistrations] = useState(initialRegistrations);
  const [syncedStands, setSyncedStands] = useState(initialStands);
  if (initialRegistrations !== syncedRegistrations) {
    setSyncedRegistrations(initialRegistrations);
    setRegistrations(initialRegistrations);
  }
  if (initialStands !== syncedStands) {
    setSyncedStands(initialStands);
    setStands(initialStands);
  }
  const [syncedRefunds, setSyncedRefunds] = useState(initialRefunds);
  if (initialRefunds !== syncedRefunds) {
    setSyncedRefunds(initialRefunds);
    setRefunds(initialRefunds);
  }

  // "event_stands" es de lectura pública, así que sí llega por Realtime
  // con la anon key. "registrations" tiene datos de contacto protegidos
  // por RLS (sin política para anon), así que esa tabla se mantiene al
  // día refrescando la página cada cierto tiempo (ver más abajo) en vez
  // de una suscripción realtime.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-stands-admin-${selectedEvent.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_stands",
          filter: `event_id=eq.${selectedEvent.id}`,
        },
        (payload) => {
          const updated = payload.new as EventStandRow;
          setStands((prev) =>
            prev.map((s) => (s.stand_id === updated.stand_id ? updated : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEvent.id]);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(interval);
  }, [router]);

  const stats = useMemo(() => {
    const reservable = stands;
    const sold = reservable.filter((s) => s.status === "sold").length;
    const pending = reservable.filter((s) => s.status === "pending").length;
    const available = reservable.filter((s) => s.status === "available").length;

    // Vigentes: los que siguen dentro. Un rechazado nunca entró y un
    // cancelado ya se salió, así que ninguno de los dos debe nada — si
    // contaran, el saldo pendiente mostraría dinero que nadie va a
    // pagar.
    const live = registrations.filter(
      (r) => r.status !== "rejected" && r.status !== "cancelled"
    );

    // Precio de lista y descuentos van por separado: "se cobró menos" y
    // "se decidió cobrar menos" son dos cosas distintas en un corte.
    const listPrice = live.reduce((sum, r) => sum + Number(r.plan_price), 0);
    const discounts = live.reduce((sum, r) => sum + discountAmount(r), 0);
    const expected = listPrice - discounts;
    const collected = live.reduce((sum, r) => sum + Number(r.amount_reported), 0);

    // Lo que alcanzó a pagar un cancelado sigue en la cuenta mientras no
    // se le devuelva; deja de ser ingreso esperado, no deja de existir.
    const cancelledPaid = registrations
      .filter((r) => r.status === "cancelled")
      .reduce((sum, r) => sum + Number(r.amount_reported), 0);

    // Las bajas con devolución ya no están en `registrations`, así que
    // su dinero hay que traerlo de aquí: lo devuelto salió de la caja y
    // lo retenido se quedó, y sin sumarlo el corte queda corto.
    const refunded = refunds.reduce((sum, x) => sum + Number(x.amount_refunded), 0);
    const kept = refunds.reduce(
      (sum, x) => sum + (Number(x.amount_paid) - Number(x.amount_refunded)),
      0
    );

    return {
      total: reservable.length,
      sold,
      pending,
      available,
      listPrice,
      discounts,
      expected,
      collected,
      cancelledPaid,
      refunded,
      kept,
      inCash: collected + cancelledPaid + kept,
      balance: expected - collected,
    };
  }, [stands, registrations, refunds]);

  const filtered = registrations.filter(
    (r) => filter === "all" || r.status === filter
  );

  async function updateStatus(id: string, status: RegistrationStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        const reg = registrations.find((r) => r.id === id);
        if (reg) {
          const standStatus =
            status === "approved"
              ? "sold"
              : status === "rejected" || status === "cancelled"
                ? "available"
                : "pending";
          setStands((prev) =>
            prev.map((s) =>
              s.stand_id === reg.stand_id ? { ...s, status: standStatus } : s
            )
          );
        }
      }
    } finally {
      setBusyId(null);
    }
  }

  /** Lanza si falla, para que la edición en línea revierta y avise. */
  async function renameRegistration(id: string, businessName: string) {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName }),
    });
    if (!res.ok) throw new Error("rename failed");
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, business_name: businessName } : r))
    );
  }

  /** Lanza si falla, para que el control revierta y avise. */
  async function setDiscount(
    id: string,
    discountType: "percent" | "amount" | null,
    discountValue: number
  ) {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountType, discountValue }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "discount failed");
    }
    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              discount_type: discountType,
              discount_value: discountType ? discountValue : 0,
            }
          : r
      )
    );
  }

  /**
   * Da de baja a un expositor. Con `refunded` distinto de null, la
   * devolución se anota antes de borrar: es lo que mantiene honestas
   * las cuentas cuando el dinero entró y volvió a salir.
   */
  async function deleteRegistration(
    id: string,
    refunded: number | null,
    note: string
  ) {
    setBusyId(id);
    try {
      const query = new URLSearchParams();
      if (refunded !== null) {
        query.set("refunded", String(refunded));
        if (note) query.set("note", note);
      }
      const res = await fetch(
        `/api/admin/registrations/${id}${query.size > 0 ? `?${query}` : ""}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const reg = registrations.find((r) => r.id === id);
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
        if (reg) {
          setStands((prev) =>
            prev.map((s) =>
              s.stand_id === reg.stand_id ? { ...s, status: "available" } : s
            )
          );
        }
        // La devolución la acaba de crear el servidor; se recarga para
        // que aparezca en los totales con su id y su fecha de verdad.
        if (refunded !== null) router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function viewProof(path: string) {
    const res = await fetch(`/api/admin/proof-url?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            Panel de expositores — {EVENT_CONFIG.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {selectedEvent.name} ·{" "}
            {formatEventDates(selectedEvent.date_start, selectedEvent.date_end)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {events.length > 1 && (
            <select
              value={selectedEvent.id}
              onChange={(e) => router.push(`/admin/dashboard?event=${e.target.value}`)}
              className="min-h-[44px] rounded-full border-2 border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-pink-300 focus:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-100"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/admin/dashboard/eventos">
            <Button variant="ghost">Ediciones 🗓️</Button>
          </Link>
          <Link href={`/admin/dashboard/convocatorias?event=${selectedEvent.id}`}>
            <Button variant="ghost">Convocatorias 🎤</Button>
          </Link>
          <Link href={`/admin/dashboard/encuestas?event=${selectedEvent.id}`}>
            <Button variant="ghost">Encuestas 📊</Button>
          </Link>
          <Link href={`/admin/dashboard/plan?event=${selectedEvent.id}`}>
            <Button variant="ghost">Plan logístico 📋</Button>
          </Link>
          <a href={`/api/admin/export-excel?event=${selectedEvent.id}`}>
            <Button variant="secondary">Descargar Excel</Button>
          </a>
          <Button variant="ghost" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Stands disponibles" value={stats.available} />
        <StatCard label="En proceso" value={stats.pending} />
        <StatCard label="Apartados" value={stats.sold} />
        <StatCard label="Total de stands" value={stats.total} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={
            stats.discounts > 0
              ? `Ingreso esperado (−${formatMoney(stats.discounts)})`
              : "Ingreso esperado"
          }
          value={formatMoney(stats.expected)}
          tone="lavender"
        />
        <StatCard
          label="Recaudado (reportado)"
          value={formatMoney(stats.collected)}
          tone="mint"
        />
        <StatCard
          label="Falta por liquidar"
          value={formatMoney(stats.balance)}
          tone="pink"
        />
      </div>

      {/* Sólo aparece cuando hay bajas con devolución: si no, sería una
          fila de ceros ocupando la pantalla todo el tiempo. */}
      {(refunds.length > 0 || stats.cancelledPaid > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pagado por cancelados"
            value={formatMoney(stats.cancelledPaid)}
          />
          <StatCard
            label={`Devuelto a ${refunds.length} ${refunds.length === 1 ? "baja" : "bajas"}`}
            value={formatMoney(stats.refunded)}
          />
          <StatCard label="Retenido de esas bajas" value={formatMoney(stats.kept)} />
          <StatCard
            label="En caja (todo lo que entró)"
            value={formatMoney(stats.inCash)}
            tone="mint"
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.key
                ? "bg-pink-500 text-white"
                : "bg-pink-50 text-ink-soft hover:bg-pink-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-pink-100 text-ink-soft">
              <Th>Folio</Th>
              <Th>Stand</Th>
              <Th>Negocio</Th>
              <Th>Día</Th>
              <Th>Contacto</Th>
              <Th>Plan</Th>
              <Th>Categoría</Th>
              <Th>Monto</Th>
              <Th>Estatus</Th>
              <Th>Comprobante</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-pink-50 last:border-0">
                <Td className="font-mono font-medium text-pink-700">#{r.folio_number}</Td>
                <Td className="font-semibold">#{r.stand_id}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {logoPublicUrl(r.logo_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPublicUrl(r.logo_path)!}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg border border-pink-100 bg-white object-contain"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-pink-100 text-[10px] text-ink-soft">
                        sin
                      </span>
                    )}
                    {/* El nombre del negocio se imprime en el plan de
                        la sede: una falta de ortografía se corrige aquí
                        sin tocar el resto del registro. */}
                    <InlineEdit
                      ariaLabel={`Nombre del negocio ${r.business_name}`}
                      value={r.business_name}
                      className="-ml-2 min-w-[140px] text-sm text-ink"
                      onSave={(value) => renameRegistration(r.id, value)}
                    />
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {r.participation_day ? formatDayShort(r.participation_day) : "Todos"}
                </Td>
                <Td>
                  <div>{r.contact_name}</div>
                  <div className="text-xs text-ink-soft">{r.phone}</div>
                </Td>
                <Td>
                  {r.plan_label}
                  {r.is_shared && (
                    <span className="ml-1.5 rounded-full bg-lavender-100 px-2 py-0.5 text-xs font-semibold text-lavender-500">
                      Compartido
                    </span>
                  )}
                </Td>
                <Td>
                  {r.business_category}
                  {r.product_details && (
                    <div className="mt-0.5 max-w-[240px] text-xs text-ink-soft">
                      {r.product_details}
                    </div>
                  )}
                </Td>
                <Td>
                  {formatMoney(Number(r.amount_reported))}
                  <div className="text-xs text-ink-soft">
                    de {formatMoney(finalPrice(r))}
                    {discountAmount(r) > 0 && (
                      <span className="ml-1 line-through">
                        {formatMoney(Number(r.plan_price))}
                      </span>
                    )}
                  </div>
                  <DiscountCell
                    registration={r}
                    onSave={(discountType, discountValue) =>
                      setDiscount(r.id, discountType, discountValue)
                    }
                  />
                </Td>
                <Td>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => viewProof(r.payment_proof_path)}
                      className="text-pink-700 underline underline-offset-2"
                    >
                      Ver comprobante
                    </button>
                    {r.payment_proof_path_2 && (
                      <button
                        onClick={() => viewProof(r.payment_proof_path_2!)}
                        className="text-pink-700 underline underline-offset-2"
                      >
                        Ver 2do comprobante
                      </button>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                      <Button
                        size="md"
                        variant="secondary"
                        disabled={busyId === r.id || r.status === "approved"}
                        onClick={() => updateStatus(r.id, "approved")}
                        className="!px-3 !py-1 text-xs"
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="md"
                        variant="danger"
                        disabled={busyId === r.id || r.status === "rejected"}
                        onClick={() => updateStatus(r.id, "rejected")}
                        className="!px-3 !py-1 text-xs"
                      >
                        Rechazar
                      </Button>
                      {/* Cancelar es para quien ya estaba dentro y se
                          da de baja: libera el stand y deja el registro
                          en el historial para el reacomodo. */}
                      <Button
                        size="md"
                        variant="ghost"
                        disabled={busyId === r.id || r.status === "cancelled"}
                        onClick={() => updateStatus(r.id, "cancelled")}
                        className="!px-3 !py-1 text-xs"
                      >
                        Dar de baja
                      </Button>
                      {/* Eliminar de verdad, a diferencia de "Dar de
                          baja" de arriba: borra el registro y, si el
                          expositor ya había pagado, pide anotar cuánto
                          se le devolvió antes de que desaparezca. */}
                      <DeleteRegistration
                        registration={r}
                        busy={busyId === r.id}
                        onDelete={(refunded, note) =>
                          deleteRegistration(r.id, refunded, note)
                        }
                      />
                  </div>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <Td colSpan={10} className="py-8 text-center text-ink-soft">
                  No hay registros en esta categoría.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${EVENT_CONFIG.currency}`;
}

function StatCard({
  label,
  value,
  tone = "pink",
}: {
  label: string;
  value: string | number;
  tone?: "pink" | "mint" | "lavender";
}) {
  const toneClass = {
    pink: "bg-pink-50",
    mint: "bg-mint-100/60",
    lavender: "bg-lavender-100/60",
  }[tone];
  return (
    <Card className={`p-4 ${toneClass} border-transparent`}>
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
      <div className="font-heading mt-1 text-xl font-bold text-ink">{value}</div>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold">{children}</th>;
}

function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 align-top ${className ?? ""}`}>
      {children}
    </td>
  );
}
