#!/usr/bin/env node
/**
 * Prepara las ilustraciones de los personajes para la página.
 *
 * Cada edición cambia el tema y con él las ilustraciones. Este script
 * existe para que eso sea dejar archivos en una carpeta y correr un
 * comando, en vez de recortar, escalar y convertir a mano ocho veces.
 *
 *   1. Guarda las nuevas en  arte/personajes/
 *      con el nombre del personaje: Nyxie.png, mofu.PNG, kaini.webp…
 *      (no importan mayúsculas ni la extensión)
 *   2. Corre  npm run personajes
 *   3. Listo. Las medidas se leen solas del archivo, así que no hay que
 *      tocar código aunque la nueva ilustración tenga otra forma.
 *
 * Lo que hace con cada una: le recorta el espacio transparente de
 * alrededor (vienen en lienzos cuadrados enormes), la escala a una
 * altura pareja y la guarda como webp en public/.
 */

import { readdir, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const NOMBRES = [
  "mofu",
  "nyxie",
  "mimirosa",
  "hanzo",
  "rakkun",
  "charmy",
  "nori",
  "kaini",
];

const ENTRADA = "arte/personajes";
const SALIDA = "public";

/**
 * Altura a la que se guardan todas. Es generosa a propósito: la página
 * las dibuja mucho más chicas, y de aquí salen también las imágenes que
 * se ven al compartir un resultado.
 */
const ALTURA = 900;

/** Quita el espacio vacío alrededor del dibujo. */
async function recortar(imagen) {
  return imagen.trim({ threshold: 0 });
}

async function main() {
  if (!existsSync(ENTRADA)) {
    await mkdir(ENTRADA, { recursive: true });
    console.log(`Creé ${ENTRADA}/. Deja ahí las ilustraciones y vuelve a correr esto.`);
    return;
  }

  const IMAGENES = /\.(png|jpe?g|webp|tiff?|avif|gif)$/i;
  const archivos = (await readdir(ENTRADA)).filter(
    (nombre) =>
      !nombre.startsWith(".") &&
      // El README de la carpeta no es una ilustración; avisar de él en
      // cada corrida sería ruido.
      IMAGENES.test(nombre) &&
      statSync(path.join(ENTRADA, nombre)).isFile()
  );

  if (archivos.length === 0) {
    console.log(`No hay nada en ${ENTRADA}/.`);
    console.log(`Deja ahí los archivos con el nombre del personaje: ${NOMBRES.join(", ")}.`);
    return;
  }

  let hechos = 0;
  const sinDueno = [];

  for (const archivo of archivos) {
    const base = path.parse(archivo).name.toLowerCase().replace(/[^a-z]/g, "");
    // "Norii.PNG" o "nori-diciembre.png" siguen siendo Nori.
    const id = NOMBRES.find((nombre) => base.startsWith(nombre));

    if (!id) {
      sinDueno.push(archivo);
      continue;
    }

    const destino = path.join(SALIDA, `char-${id}.webp`);
    const original = sharp(path.join(ENTRADA, archivo));
    const antes = await original.metadata();

    const salida = await (await recortar(original.clone()))
      .resize({ height: ALTURA, fit: "inside", withoutEnlargement: false })
      .webp({ quality: 90, effort: 6 })
      .toFile(destino);

    console.log(
      `${id.padEnd(9)} ${antes.width}x${antes.height} → ${salida.width}x${salida.height}` +
        `  ${Math.round(salida.size / 1024)} KB  ${destino}`
    );
    hechos++;
  }

  for (const archivo of sinDueno) {
    console.log(`· Ignoré "${archivo}": el nombre no coincide con ningún personaje.`);
  }

  const faltan = NOMBRES.filter((id) => !existsSync(path.join(SALIDA, `char-${id}.webp`)));
  if (faltan.length > 0) {
    console.log(`\nFaltan ilustraciones de: ${faltan.join(", ")}.`);
    console.log("La página no compila sin las ocho.");
    process.exitCode = 1;
    return;
  }

  console.log(`\n${hechos} ${hechos === 1 ? "ilustración lista" : "ilustraciones listas"}.`);
  console.log("Revisa cómo se ven en /test/todos antes de subirlas.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
