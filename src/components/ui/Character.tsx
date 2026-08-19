import Image from "next/image";
import clsx from "clsx";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

/**
 * Un personaje del elenco, como decoración.
 *
 * Van con alt vacío y aria-hidden a propósito: un lector de pantalla no
 * tiene por qué leer "Nyxie, Mofu, Hanzo" antes de cada formulario.
 *
 * Se llaman por su nombre, no por su especie. El archivo que antes se
 * llamaba "camaleon" era en realidad Hanzo, el sapo, y la camaleona de
 * verdad es Charmy — ese enredo ya costó una confusión.
 *
 * Si un personaje todavía no tiene ilustración no se dibuja nada: es
 * decoración, y una imagen rota se ve peor que su ausencia.
 */
export type CharacterName = CharacterId;

interface CharacterProps {
  name: CharacterId;
  /** Ancho en píxeles; la altura sale sola de la proporción. */
  size?: number;
  /** Flota suavemente (se apaga solo con prefers-reduced-motion). */
  float?: boolean;
  className?: string;
  priority?: boolean;
}

export function Character({
  name,
  size = 96,
  float = true,
  className,
  priority,
}: CharacterProps) {
  const character = CHARACTERS[name];
  if (!character?.image || !character.imageWidth || !character.imageHeight) {
    return null;
  }

  return (
    <Image
      src={character.image}
      alt=""
      aria-hidden="true"
      width={character.imageWidth}
      height={character.imageHeight}
      priority={priority}
      style={{ width: size, height: "auto" }}
      className={clsx("h-auto max-w-full", float && "mofu-float", className)}
    />
  );
}
