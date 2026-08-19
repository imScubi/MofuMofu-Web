import Image from "next/image";
import clsx from "clsx";
import { CHARACTERS, monogram, type CharacterId } from "@/lib/characters";

/**
 * El retrato de un personaje en el test.
 *
 * A diferencia del componente decorativo, éste sí lleva alt: aquí el
 * personaje ES la información, no el adorno. Y mientras alguno no tenga
 * ilustración, enseña un monograma con su color en vez de un hueco.
 */
export function CharacterPortrait({
  id,
  size = 180,
  className,
  priority,
}: {
  id: CharacterId;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const character = CHARACTERS[id];

  if (character.image && character.imageWidth && character.imageHeight) {
    return (
      <Image
        src={character.image}
        alt={`${character.name}, ${character.species.toLowerCase()}`}
        width={character.imageWidth}
        height={character.imageHeight}
        priority={priority}
        style={{ width: size, height: "auto" }}
        className={clsx("h-auto max-w-full", className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${character.name}, ${character.species.toLowerCase()}`}
      style={{
        width: size,
        height: size,
        backgroundColor: character.softColor,
        color: character.color,
        borderColor: character.color,
      }}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full border-4 font-heading font-extrabold",
        className
      )}
    >
      <span style={{ fontSize: size * 0.34 }}>{monogram(character)}</span>
    </span>
  );
}
