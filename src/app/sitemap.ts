import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/client";
import { contestAvailability } from "@/lib/contestStatus";
import { absoluteUrl } from "@/lib/site";
import { CHARACTER_IDS } from "@/lib/characters";
import type { ContestRow, EventRow } from "@/lib/types";

export const revalidate = 3600;

/**
 * El mapa del sitio para Google. Incluye las páginas fijas y una entrada
 * por convocatoria abierta, para que un concurso nuevo se pueda
 * encontrar sin esperar a que el buscador lo tropiece solo.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/registro"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/convocatorias"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/test"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/test/todos"), changeFrequency: "monthly", priority: 0.5 },
    // Cada personaje es un link que la gente comparte; conviene que
    // Google los conozca porque son puerta de entrada al sitio.
    ...CHARACTER_IDS.map((id) => ({
      url: absoluteUrl(`/test/${id}`),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    {
      url: absoluteUrl("/registro/completar"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = createClient();
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("is_open", true);
    const events = (eventsData as EventRow[]) ?? [];
    if (events.length === 0) return staticPages;

    const { data: contestsData } = await supabase
      .from("contests")
      .select("*")
      .in(
        "event_id",
        events.map((e) => e.id)
      );

    const contests = ((contestsData as ContestRow[]) ?? []).filter(
      (c) => contestAvailability(c).open
    );

    return [
      ...staticPages,
      ...contests.map((contest) => ({
        url: absoluteUrl(`/convocatorias/${contest.id}`),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // Si la base no responde, un sitemap con las páginas fijas es mejor
    // que un error 500 que Google interpreta como sitio roto.
    return staticPages;
  }
}
