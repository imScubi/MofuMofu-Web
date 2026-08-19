import Image from "next/image";
import clsx from "clsx";
import { CHARACTER_IMAGES, heightBox } from "@/lib/characterImages";
import type { CharacterId } from "@/lib/characters";

/**
 * Un personaje del elenco, como decoración.
 *
 * Va con alt vacío y aria-hidden a propósito: un lector de pantalla no
 * tiene por qué leer "Nyxie, Mofu, Hanzo" antes de cada formulario.
 *
 * Se llaman por su nombre, no por su especie. El archivo que antes se
 * llamaba "camaleon" era en realidad Hanzo, el sapo, y la camaleona de
 * verdad es Charmy — ese enredo ya costó una confusión.
 */
export type CharacterName = CharacterId;

interface CharacterProps {
  name: CharacterId;
  /** Qué tan alto se dibuja; el ancho sale de la proporción del archivo. */
  size?: number;
  /** Flota suavemente (se apaga solo con prefers-reduced-motion). */
  float?: boolean;
  className?: string;
  priority?: boolean;
}

export function Character({
  name,
  size = 120,
  float = true,
  className,
  priority,
}: CharacterProps) {
  const image = CHARACTER_IMAGES[name];
  const box = heightBox(name, size);

  return (
    <Image
      src={image}
      alt=""
      aria-hidden="true"
      priority={priority}
      style={{ width: box.width, height: box.height }}
      className={clsx("max-w-full", float && "mofu-float", className)}
    />
  );
}
