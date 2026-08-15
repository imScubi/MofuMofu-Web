import { RegistrationForm } from "@/components/RegistrationForm";
import { createClient } from "@/lib/supabase/client";
import type { StandRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("stands")
    .select("id, price, status, reservable, updated_at")
    .order("id");

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Registro de expositores
        </h1>
        <p className="mt-2 text-ink-soft">
          Sigue estos 3 pasos para apartar tu lugar 🎀
        </p>
      </div>
      <RegistrationForm initialStands={(data as StandRow[]) ?? []} />
    </main>
  );
}
