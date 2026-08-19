import type { StaticImageData } from "next/image";
import type { CharacterId } from "@/lib/characters";

import charmy from "../../public/char-charmy.webp";
import hanzo from "../../public/char-hanzo.webp";
import kaini from "../../public/char-kaini.webp";
import mimirosa from "../../public/char-mimirosa.webp";
import mofu from "../../public/char-mofu.webp";
import nori from "../../public/char-nori.webp";
import nyxie from "../../public/char-nyxie.webp";
import rakkun from "../../public/char-rakkun.webp";

/**
 * Las ilustraciones del elenco.
 *
 * Se importan en vez de referenciarse por ruta a propósito: así el ancho
 * y el alto salen del archivo mismo. Cada edición cambia la ilustración
 * temática de los personajes, y si las medidas estuvieran escritas a
 * mano habría que corregirlas cada vez — y una medida equivocada estira
 * o aplasta al personaje sin avisar.
 *
 * Para cambiarlas: deja los archivos nuevos en `arte/personajes/` y
 * corre `npm run personajes`. Eso los recorta, los escala y los deja
 * aquí con el nombre correcto. No hay que tocar este archivo.
 *
 * Si falta alguno, la compilación falla en vez de dejar un hueco en la
 * página: es la clase de error que conviene descubrir antes de subir.
 */
export const CHARACTER_IMAGES: Record<CharacterId, StaticImageData> = {
  mofu,
  nyxie,
  mimirosa,
  hanzo,
  rakkun,
  charmy,
  nori,
  kaini,
};

/**
 * La altura manda sobre el ancho.
 *
 * Hanzo es un sapo achaparrado: mide 0.96 de alto por cada uno de
 * ancho, mientras Rakkun mide 1.61. Puestos al mismo ancho, Hanzo se ve
 * la mitad de grande que los demás. Igualando la altura, cada quien
 * ocupa el mismo espacio vertical y la fila se ve pareja, sin números
 * calibrados a mano que se rompan con la siguiente ilustración.
 */
export function heightBox(id: CharacterId, height: number) {
  const image = CHARACTER_IMAGES[id];
  return {
    width: Math.round((image.width / image.height) * height),
    height,
  };
}
