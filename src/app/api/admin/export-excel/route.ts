import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEventWorkbook } from "@/lib/excelWorkbook";
import type {
  ContestEntryRow,
  ContestRow,
  EventRow,
  EventStandRow,
  RegistrationRow,
} from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Cada edición del evento se exporta a su propio Excel.
  const requestedEventId = new URL(request.url).searchParams.get("event");
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .order("date_start");
  const events = (eventsData as EventRow[]) ?? [];
  const event =
    events.find((e) => e.id === requestedEventId) ??
    events.find((e) => e.is_open) ??
    events[0];

  if (!event) {
    return NextResponse.json(
      { message: "Todavía no hay ediciones del evento." },
      { status: 404 }
    );
  }

  const [
    { data: standsData },
    { data: registrationsData },
    { data: contestsData },
    { data: entriesData },
  ] = await Promise.all([
    supabase.from("event_stands").select("*").eq("event_id", event.id).order("stand_id"),
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at"),
    supabase.from("contests").select("*").eq("event_id", event.id).order("created_at"),
    supabase
      .from("contest_entries")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at"),
  ]);

  const workbook = await buildEventWorkbook({
    event,
    reservableStands: (standsData as EventStandRow[]) ?? [],
    registrations: (registrationsData as RegistrationRow[]) ?? [],
    contests: (contestsData as ContestRow[]) ?? [],
    contestEntries: (entriesData as ContestEntryRow[]) ?? [],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = event.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const filename = `expositores-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
