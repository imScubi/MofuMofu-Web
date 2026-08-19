"use client";

import { RefObject, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import { CHARACTERS } from "@/lib/characters";
import { AXES } from "@/lib/quizAxes";
import { QUIZ_RESULTS } from "@/lib/quizResults";
import type { QuizOutcome } from "@/lib/quizScoring";
import { SITE_URL } from "@/lib/site";

/**
 * El resultado.
 *
 * Está armado para leerse de arriba a abajo como si alguien te
 * describiera: primero quién eres, luego las señales que te hacen decir
 * "sí, exacto", después eso que te han criticado leído al derecho, y al
 * final dónde encajas — que es lo único que de verdad queríamos decir.
 */
export function QuizResultCard({
  outcome,
  tally,
  onRestart,
  headingRef,
}: {
  outcome: QuizOutcome;
  tally: { total: number; counts: Record<string, number> } | null;
  onRestart: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const character = CHARACTERS[outcome.character];
  const result = QUIZ_RESULTS[outcome.character];
  const runnerUp = CHARACTERS[outcome.runnerUp];
  const [copied, setCopied] = useState(false);

  const shareUrl = `${SITE_URL}/test/${character.id}`;
  const shareText = `Salí ${character.name} (${outcome.code}) en el test de MofuMofu Market. ${result.superpower}. ¿Tú quién eres?`;

  const percent =
    tally && tally.total >= 20
      ? Math.max(1, Math.round(((tally.counts[character.id] ?? 0) / tally.total) * 100))
      : null;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Soy ${character.name}`, text: shareText, url: shareUrl });
        return;
      } catch {
        // Canceló el menú de compartir: no es un error.
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden p-0">
        <div
          className="px-6 pb-6 pt-7 text-center sm:px-8"
          style={{ backgroundColor: character.softColor }}
        >
          <CharacterPortrait
            id={character.id}
            size={190}
            className="mx-auto"
            priority
          />
          <p className="mt-3 text-sm font-bold uppercase tracking-wide" style={{ color: character.color }}>
            {character.species} · {outcome.code}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-4xl font-extrabold text-ink outline-none"
          >
            {result.headline}
          </h1>
          <p className="mt-1 font-heading text-lg font-bold" style={{ color: character.color }}>
            {character.tagline}
          </p>
          {percent !== null && (
            <p className="mt-3 inline-block rounded-full bg-white/70 px-3 py-1 text-[13px] font-bold text-ink">
              Eres parte del {percent}% de la comunidad que salió {character.name}
            </p>
          )}
        </div>

        <div className="space-y-7 p-6 sm:p-8">
          {result.portrait.map((paragraph, i) => (
            <p key={i} className="text-[15.5px] leading-[1.7] text-ink">
              {paragraph}
            </p>
          ))}

          <div>
            <h2 className="font-heading text-lg font-bold text-ink">
              Señales inconfundibles
            </h2>
            <ul className="mt-2.5 space-y-2">
              {result.signals.map((signal) => (
                <li key={signal} className="flex gap-2.5 text-[15px] leading-[1.6] text-ink">
                  <span aria-hidden="true" style={{ color: character.color }}>
                    ✦
                  </span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: character.softColor }}
          >
            <h2 className="font-heading text-lg font-bold text-ink">
              Lo que confunden contigo
            </h2>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-ink">{result.reframe}</p>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold text-ink">Tu don</h2>
            <p
              className="mt-1 font-heading text-xl font-bold leading-snug"
              style={{ color: character.color }}
            >
              {result.superpower}
            </p>
          </div>

          {/* Cómo funcionas, según los cuatro ejes. Es lo que hace que dos
              personas con el mismo personaje no lean lo mismo. */}
          <div>
            <h2 className="font-heading text-lg font-bold text-ink">
              Tu código: {outcome.code}
            </h2>
            <ul className="mt-2.5 space-y-2.5">
              {AXES.map((axis) => {
                const pole = axis[outcome.axes[axis.id]];
                const strength = outcome.axisStrength[axis.id];
                return (
                  <li key={axis.id} className="text-[15px] leading-[1.6] text-ink">
                    <span className="font-bold" style={{ color: character.color }}>
                      {pole.letter} · {pole.name}
                    </span>{" "}
                    <span className="text-ink-soft">({strength}%)</span> — {pole.blurb}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold text-ink">Tu gente</h2>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-ink">{result.belonging}</p>
            <p className="mt-2.5 text-[15px] leading-[1.65] text-ink">
              También te pareces a <strong>{runnerUp.name}</strong>, y en PuffiLand
              te llevarías increíble con{" "}
              <strong>{CHARACTERS[character.friends[0]].name}</strong>
              {character.friends[1] && (
                <>
                  {" "}y <strong>{CHARACTERS[character.friends[1]].name}</strong>
                </>
              )}
              .
              {outcome.sameCode.length > 0 && (
                <>
                  {" "}
                  Compartes código exacto con{" "}
                  <strong>
                    {outcome.sameCode.map((id) => CHARACTERS[id].name).join(" y ")}
                  </strong>
                  .
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-pink-100 bg-pink-50 p-5">
            <p className="text-[15px] font-semibold leading-[1.6] text-ink">
              {result.invitation}
            </p>
            {/* El botón grande es el que sigue a la invitación que
                acaba de leer; el otro queda a un lado por si acaso. */}
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {result.cta === "convocatoria" ? (
                <>
                  <Link href="/convocatorias">
                    <Button size="md">Ver convocatorias</Button>
                  </Link>
                  <Link href="/registro">
                    <Button size="md" variant="secondary">
                      Apartar un stand
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/registro">
                    <Button size="md">Apartar mi stand</Button>
                  </Link>
                  <Link href="/convocatorias">
                    <Button size="md" variant="secondary">
                      Ver convocatorias
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-pink-100 pt-6">
            <Button onClick={share}>
              {copied ? "¡Link copiado!" : "Compartir mi resultado"}
            </Button>
            <Button variant="ghost" onClick={onRestart}>
              Volver a hacer el test
            </Button>
            <Link href="/test/todos">
              <Button variant="ghost">Conocer a los ocho</Button>
            </Link>
          </div>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Este test es para divertirse y conocer a los personajes. No mide nada
        científicamente, y de eso justo se trata.
      </p>
    </div>
  );
}
