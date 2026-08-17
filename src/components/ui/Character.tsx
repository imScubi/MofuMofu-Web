import Image from "next/image";
import clsx from "clsx";

// Los personajes son decoración: van con alt vacío y aria-hidden para
// que un lector de pantalla no lea "gato, ratón, camaleón" antes de cada
// formulario. Las medidas reales evitan que la página salte al cargar.
const CHARACTERS = {
  gato: { src: "/char-gato.webp", width: 600, height: 786 },
  conejita: { src: "/char-conejita.webp", width: 600, height: 879 },
  raton: { src: "/char-raton.webp", width: 600, height: 802 },
  camaleon: { src: "/char-camaleon.webp", width: 600, height: 578 },
} as const;

export type CharacterName = keyof typeof CHARACTERS;

interface CharacterProps {
  name: CharacterName;
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
  return (
    <Image
      src={character.src}
      alt=""
      aria-hidden="true"
      width={character.width}
      height={character.height}
      priority={priority}
      style={{ width: size, height: "auto" }}
      className={clsx("h-auto max-w-full", float && "mofu-float", className)}
    />
  );
}
