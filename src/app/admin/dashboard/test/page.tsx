import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from "@/lib/characters";
import { AXES } from "@/lib/quizAxes";

export const dynamic = "force-dynamic";

/**
 * Quién es tu público, según el test.
 *
 * No es un adorno: si la mitad de quienes contestan salen Rakkun,
 * conviene traer más TCG a la siguiente edición. Los ejes dicen lo
 * mismo en grande — un público de Refugio agradece rincones para
 * sentarse; uno de Fiesta, escenario.
 */
export default async function AdminTestPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quiz_results")
    .select("character_id, code, created_at")
    .order("created_at", { ascending: false });

  const rows = (data as { character_id: string; code: string; created_at: string }[]) ?? [];
  const total = rows.length;

  const counts = Object.fromEntries(CHARACTER_IDS.map((id) => [id, 0])) as Record<
    CharacterId,
    number
  >;
  for (const row of rows) {
    if (row.character_id in counts) counts[row.character_id as CharacterId] += 1;
  }

  const ranked = [...CHARACTER_IDS].sort((a, b) => counts[b] - counts[a]);
  const top = counts[ranked[0]] || 1;

  // Cuánta gente cae de cada lado de cada eje.
  const poleTally = AXES.map((axis, position) => {
    const a = rows.filter((row) => row.code[position] === axis.a.letter).length;
    return { axis, a, b: total - a };
  });

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink">
              Test de personaje
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {total === 0
                ? "Todavía nadie lo ha contestado."
                : `${total} ${total === 1 ? "persona lo contestó" : "personas lo han contestado"}.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/test" target="_blank">
              <Button variant="secondary">Ver el test ↗</Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button variant="ghost">← Volver a registros</Button>
            </Link>
          </div>
        </div>

        {total === 0 ? (
          <Card className="mt-6 p-8 text-center">
            <p className="text-ink-soft">
              Comparte el link del test y aquí vas a ver quién es tu público.
            </p>
            <p className="mt-2 font-mono text-sm text-pink-700">/test</p>
          </Card>
        ) : (
          <>
            <Card className="mt-6 p-5 sm:p-6">
              <h2 className="font-heading text-lg font-bold text-ink">
                Qué personaje sale más
              </h2>
              <div className="mt-4 space-y-3">
                {ranked.map((id) => {
                  const character = CHARACTERS[id];
                  const n = counts[id];
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <CharacterPortrait id={id} size={40} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-heading text-sm font-bold text-ink">
                            {character.name}
                          </span>
                          <span className="text-sm text-ink-soft">
                            {n} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max((n / top) * 100, n > 0 ? 4 : 0)}%`,
                              backgroundColor: character.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="mt-4 p-5 sm:p-6">
              <h2 className="font-heading text-lg font-bold text-ink">
                Cómo es tu público
              </h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Los cuatro ejes, sumando a todos los que contestaron.
              </p>
              <div className="mt-4 space-y-4">
                {poleTally.map(({ axis, a, b }) => {
                  const pctA = total > 0 ? Math.round((a / total) * 100) : 50;
                  return (
                    <div key={axis.id}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-bold text-ink">{axis.a.name}</span>
                        <span className="text-xs text-ink-soft">{axis.question}</span>
                        <span className="font-bold text-ink">{axis.b.name}</span>
                      </div>
                      <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-cream">
                        <div
                          className="h-full bg-pink-500"
                          style={{ width: `${pctA}%` }}
                        />
                        <div
                          className="h-full flex-1 bg-lavender-300"
                          style={{ width: `${100 - pctA}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-ink-soft">
                        <span>
                          {a} ({pctA}%)
                        </span>
                        <span>
                          {b} ({100 - pctA}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
