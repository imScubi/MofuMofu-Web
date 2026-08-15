// Geometría del mapa de stands — coordenadas calibradas a mano sobre la
// imagen real del plano del evento (public/stand-map.webp).
//
// Todas las posiciones están en el mismo espacio de píxeles que la imagen
// original (1056x684). Si el plano cambia, hay que volver a calibrar estos
// valores contra la nueva imagen.

export const MAP_IMAGE_SRC = "/stand-map.webp";
export const MAP_IMAGE_WIDTH = 1056;
export const MAP_IMAGE_HEIGHT = 684;

export type StandShape = "square" | "info";

export interface StandLayoutItem {
  id: string;
  x: number;
  y: number;
  size: number;
  shape: StandShape;
  /** Los stands "info" no se pueden reservar (caseta de informes, etc). */
  reservable: boolean;
}

const SIZE = 40;

function row(ids: number[], coords: [number, number][]): StandLayoutItem[] {
  return ids.map((n, i) => ({
    id: String(n),
    x: coords[i][0],
    y: coords[i][1],
    size: SIZE,
    shape: "square" as const,
    reservable: true,
  }));
}

// Fila superior: 33-38
const topRow = row(
  [33, 34, 35, 36, 37, 38],
  [
    [328, 266],
    [370, 266],
    [412, 266],
    [454, 266],
    [496, 266],
    [538, 266],
  ]
);

// Fila media: 20-32, seguida de 39 (pegado a la fila) y 40 (aparte)
const middleRow = row(
  [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 39],
  [
    [232, 348],
    [274, 348],
    [316, 348],
    [360, 348],
    [402, 348],
    [444, 348],
    [488, 348],
    [528, 348],
    [570, 348],
    [612, 348],
    [656, 348],
    [698, 348],
    [742, 348],
    [784, 348],
  ]
);

const stand40: StandLayoutItem[] = [
  { id: "40", x: 830, y: 332, size: SIZE, shape: "square", reservable: true },
];

// Fila inferior: 1-13
const bottomRow = row(
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  [
    [238, 458],
    [282, 458],
    [326, 458],
    [368, 458],
    [410, 458],
    [452, 458],
    [496, 458],
    [538, 458],
    [583, 458],
    [627, 458],
    [672, 458],
    [716, 458],
    [759, 458],
  ]
);

// Curva del lado derecho: 14-19
const rightCurve = row(
  [14, 15, 16, 17, 18, 19],
  [
    [805, 450],
    [847, 442],
    [882, 413],
    [910, 382],
    [935, 340],
    [950, 297],
  ]
);

const infoBooth: StandLayoutItem[] = [
  { id: "A", x: 592, y: 144, size: 36, shape: "info", reservable: false },
];

export const STAND_LAYOUT: StandLayoutItem[] = [
  ...bottomRow,
  ...rightCurve,
  ...middleRow,
  ...stand40,
  ...topRow,
  ...infoBooth,
];

export const RESERVABLE_STAND_IDS = STAND_LAYOUT.filter(
  (s) => s.reservable
).map((s) => s.id);
