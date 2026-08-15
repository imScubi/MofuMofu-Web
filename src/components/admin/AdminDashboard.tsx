"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import { formatEventDates } from "@/lib/formatDates";
import type {
  EventRow,
  EventStandRow,
  RegistrationRow,
  RegistrationStatus,
} from "@/lib/types";

interface AdminDashboardProps {
  events: EventRow[];
  selectedEvent: EventRow;
  initialStands: EventStandRow[];
  initialRegistrations: RegistrationRow[];
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending_review: "bg-amber-100 text-amber-500",
  approved: "bg-mint-100 text-mint-500",
  rejected: "bg-danger-50 text-danger-600",
};

const FILTERS: { key: "all" | RegistrationStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending_review", label: "En revisión" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
];

export function AdminDashboard({
  events,
  selectedEvent,
  initialStands,
  initialRegistrations,
}: AdminDashboardProps) {
  const router = useRouter();
  const [stands, setStands] = useState(initialStands);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [filter, setFilter] = useState<"all" | RegistrationStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

    const expected = registrations
      .filter((r) => r.status !== "rejected")
      .reduce((sum, r) => sum + Number(r.plan_price), 0);

    const collected = registrations
      .filter((r) => r.status !== "rejected")
      .reduce((sum, r) => sum + Number(r.amount_reported), 0);

    return {
      total: reservable.length,
      sold,
      pending,
      available,
      expected,
      collected,
      balance: expected - collected,
    };
  }, [stands, registrations]);

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
          const standStatus = status === "approved" ? "sold" : status === "rejected" ? "available" : "pending";
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

  async function deleteRegistration(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, { method: "DELETE" });
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
      }
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Ingreso esperado"
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
                <Td>{r.business_name}</Td>
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
                <Td>{r.business_category}</Td>
                <Td>
                  {formatMoney(Number(r.amount_reported))}
                  <div className="text-xs text-ink-soft">
                    de {formatMoney(Number(r.plan_price))}
                  </div>
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
                  {confirmDeleteId === r.id ? (
                    <div className="min-w-[190px] rounded-xl bg-danger-50 p-2">
                      <p className="text-xs font-bold text-danger-600">
                        ¿Borrar el folio #{r.folio_number} para siempre?
                      </p>
                      <p className="mt-0.5 text-[11px] text-danger-600">
                        Se libera el stand #{r.stand_id} y se borran sus comprobantes.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="md"
                          variant="danger"
                          disabled={busyId === r.id}
                          onClick={() => deleteRegistration(r.id)}
                          className="!px-3 !py-1 text-xs"
                        >
                          Sí, borrar
                        </Button>
                        <Button
                          size="md"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(null)}
                          className="!px-3 !py-1 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="text-xs text-ink-soft underline hover:text-danger-600 disabled:opacity-40"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
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
