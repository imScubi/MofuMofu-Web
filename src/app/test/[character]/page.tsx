import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import { CHARACTERS, CHARACTER_IDS, getCharacter } from "@/lib/characters";
import { CHARACTER_CODES } from "@/lib/quizAxes";
import { QUIZ_RESULTS } from "@/lib/quizResults";

/**
 * La página de un personaje, que es a la vez el link que se comparte.
 *
 * Vive aparte del test porque un resultado sólo se comparte si al
 * abrirlo se ve algo bonito: quien llega aquí desde el link de un amigo
 * ve de quién se trata y tiene el botón para hacer su propio test.
 */

export function generateStaticParams() {
  return [...CHARACTER_IDS.map((id) => ({ character: id })), { character: "todos" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ character: string }>;
}): Promise<Metadata> {
  const { character: id } = await params;

  if (id === "todos") {
    return {
      title: "Los ocho de PuffiLand",
      description:
        "Mofu, Nyxie, Mimirosa, Hanzo, Rakkun, Charmy, Nori y Kaini: quiénes son y cómo llegaron a la Tierra.",
      alternates: { canonical: "/test/todos" },
    };
  }

  const character = getCharacter(id);
  if (!character) return {};

  const result = QUIZ_RESULTS[character.id];
  const description = `${character.tagline}. ${result.superpower}. Haz el test y descubre si tú también eres ${character.name}.`;

  return {
    title: `Soy ${character.name}`,
    description,
    alternates: { canonical: `/test/${character.id}` },
    openGraph: {
      title: `Soy ${character.name} · ${character.species}`,
      description,
      url: `/test/${character.id}`,
      images: character.image ? [{ url: character.image }] : undefined,
    },
  };
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ character: string }>;
}) {
  const { character: id } = await params;

  if (id === "todos") return <AllCharacters />;

  const character = getCharacter(id);
  if (!character) notFound();

  const result = QUIZ_RESULTS[character.id];

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden p-0">
          <div
            className="px-6 pb-7 pt-8 text-center sm:px-8"
            style={{ backgroundColor: character.softColor }}
          >
            <CharacterPortrait id={character.id} size={200} className="mx-auto" priority />
            <p
              className="mt-3 text-sm font-bold uppercase tracking-wide"
              style={{ color: character.color }}
            >
              {character.species} · {CHARACTER_CODES[character.id]}
            </p>
            <h1 className="font-heading text-4xl font-extrabold text-ink">
              {character.name}
            </h1>
            <p className="mt-1 font-heading text-lg font-bold" style={{ color: character.color }}>
              {character.tagline}
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <p className="text-[15.5px] leading-[1.7] text-ink">{character.lore}</p>
            <p className="text-[15.5px] leading-[1.7] text-ink">{result.belonging}</p>

            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: character.softColor }}
            >
              <p className="font-heading text-lg font-bold leading-snug text-ink">
                {result.superpower}
              </p>
            </div>

            <p className="text-[15px] text-ink-soft">
              Se lleva mejor con{" "}
              {character.friends
                .map((friend) => CHARACTERS[friend].name)
                .join(" y ")}
              .
            </p>

            <div className="flex flex-wrap gap-2.5 border-t border-pink-100 pt-6">
              <Link href="/test">
                <Button>Hacer el test</Button>
              </Link>
              <Link href="/test/todos">
                <Button variant="secondary">Conocer a los ocho</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function AllCharacters() {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-ink sm:text-4xl">
            Los ocho de PuffiLand
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Nyxie, la maga más poderosa de PuffiLand, abrió unos portales en un
            experimento que le salió mal. Medio mundo terminó aquí. Mofu, que allá
            había levantado el bazar más grande que se haya visto, decidió volver
            a hacerlo en la Tierra con los amigos que cayeron con ella.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CHARACTER_IDS.map((id) => {
            const character = CHARACTERS[id];
            return (
              <Link key={id} href={`/test/${id}`} className="group">
                <Card
                  className="flex h-full items-start gap-4 p-5 transition-colors group-hover:border-pink-300"
                  style={{ borderColor: "transparent" }}
                >
                  <CharacterPortrait id={id} size={84} className="shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: character.color }}
                    >
                      {character.species} · {CHARACTER_CODES[id]}
                    </p>
                    <h2 className="font-heading text-xl font-bold text-ink">
                      {character.name}
                    </h2>
                    <p className="mt-0.5 text-sm font-semibold text-ink-soft">
                      {character.tagline}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-soft">
                      {character.lore}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/test">
            <Button size="lg">¿Cuál eres tú? Haz el test</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
