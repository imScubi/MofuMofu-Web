import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHARACTER_IDS } from "@/lib/characters";

export const runtime = "nodejs";

const schema = z.object({
  character: z.enum(CHARACTER_IDS as [string, ...string[]]),
  code: z.string().regex(/^[FR][CM][VP][GT]$/),
});

export interface QuizTally {
  total: number;
  /** Cuántos salieron de cada personaje. */
  counts: Record<string, number>;
}

async function tally(): Promise<QuizTally> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("quiz_results").select("character_id");

  const counts = Object.fromEntries(CHARACTER_IDS.map((id) => [id, 0]));
  for (const row of (data as { character_id: string }[]) ?? []) {
    if (row.character_id in counts) counts[row.character_id] += 1;
  }

  return { total: data?.length ?? 0, counts };
}

/** El reparto de toda la comunidad, para la página del resultado. */
export async function GET() {
  try {
    return NextResponse.json(await tally());
  } catch {
    // Si la base falla, el test no se rompe: simplemente no enseña el
    // porcentaje. Es adorno, no el resultado.
    return NextResponse.json({ total: 0, counts: {} });
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Resultado inválido." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("quiz_results").insert({
      character_id: parsed.data.character,
      code: parsed.data.code,
    });
    return NextResponse.json(await tally());
  } catch {
    return NextResponse.json({ total: 0, counts: {} });
  }
}
