import Image from "next/image";
import clsx from "clsx";
import { CHARACTERS, type CharacterId } from "@/lib/characters";
import { CHARACTER_IMAGES, heightBox } from "@/lib/characterImages";

/**
 * El retrato de un personaje en el test.
 *
 * A diferencia del componente decorativo, éste sí lleva alt: aquí el
 * personaje ES la información, no el adorno.
 *
 * El tamaño es la altura, no el ancho: es lo que hace que en una fila de
 * ocho todos se vean del mismo porte aunque Hanzo sea achaparrado y
 * Rakkun larguirucho.
 */
export function CharacterPortrait({
  id,
  size = 180,
  className,
  priority,
}: {
  id: CharacterId;
  /** Altura en píxeles; el ancho sale de la proporción del archivo. */
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const character = CHARACTERS[id];
  const box = heightBox(id, size);

  return (
    <Image
      src={CHARACTER_IMAGES[id]}
      alt={`${character.name}, ${character.species.toLowerCase()}`}
      priority={priority}
      style={{ width: box.width, height: box.height }}
      className={clsx("max-w-full", className)}
    />
  );
}
