import type { Metadata } from "next";
import { PersonalityQuiz } from "@/components/PersonalityQuiz";

export const metadata: Metadata = {
  title: "¿Qué personaje de MofuMofu eres?",
  description:
    "20 preguntas para descubrir a cuál de los ocho habitantes de PuffiLand te pareces: Mofu, Nyxie, Mimirosa, Hanzo, Rakkun, Charmy, Nori o Kaini.",
  alternates: { canonical: "/test" },
  openGraph: {
    title: "¿Qué personaje de MofuMofu eres?",
    description:
      "Ocho personajes cayeron por un portal desde PuffiLand. Contesta 20 preguntas y descubre cuál eres tú.",
    url: "/test",
  },
};

export default function TestPage() {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <PersonalityQuiz />
    </main>
  );
}
