// Geometría del mapa de stands, basada en el plano del evento.
// Cuando tengas el plano final/definitivo, ajusta las coordenadas x/y aquí
// (todo vive en un viewBox de 1000x680, no depende de ninguna imagen externa).

export const MAP_VIEWBOX = { width: 1000, height: 680 };

// Contorno del área del evento (silueta decorativa, estilo "parque").
export const GROUNDS_OUTLINE_PATH = `
  M 160 200
  C 160 130 200 95 270 90
  L 540 80
  C 580 78 605 95 615 125
  C 622 148 645 165 680 172
  L 880 195
  C 935 202 955 240 950 290
  L 935 420
  C 930 470 900 505 855 520
  C 800 538 740 530 700 512
  L 210 512
  C 165 512 150 480 150 440
  Z
`;

export type StandShape = "square" | "info";

export interface StandLayoutItem {
  id: string;
  x: number;
  y: number;
  size: number;
  shape: StandShape;
  /** Los stands "info" no se pueden reservar (caseta de informes, etc). */
  reservable: boolean;
  rotation?: number;
}

const SIZE = 32;

function row(
  ids: number[],
  startX: number,
  y: number,
  step: number
): StandLayoutItem[] {
  return ids.map((n, i) => ({
    id: String(n),
    x: startX + i * step,
    y,
    size: SIZE,
    shape: "square" as const,
    reservable: true,
  }));
}

const bottomRow = row(
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  205,
  465,
  34
);

const rightCurve: StandLayoutItem[] = [
  { id: "14", x: 650, y: 452, size: SIZE, shape: "square", reservable: true },
  { id: "15", x: 684, y: 434, size: SIZE, shape: "square", reservable: true },
  { id: "16", x: 712, y: 408, size: SIZE, shape: "square", reservable: true },
  { id: "17", x: 732, y: 376, size: SIZE, shape: "square", reservable: true },
  { id: "18", x: 744, y: 340, size: SIZE, shape: "square", reservable: true },
  { id: "19", x: 750, y: 302, size: SIZE, shape: "square", reservable: true },
];

const middleRow = row(
  [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  205,
  355,
  34
);

const middleExtra: StandLayoutItem[] = [
  { id: "39", x: 656, y: 355, size: SIZE, shape: "square", reservable: true },
  { id: "40", x: 706, y: 336, size: SIZE, shape: "square", reservable: true },
];

const topRow = row([33, 34, 35, 36, 37, 38], 300, 255, 34);

const infoBooth: StandLayoutItem[] = [
  { id: "A", x: 612, y: 148, size: 30, shape: "info", reservable: false },
];

export const STAND_LAYOUT: StandLayoutItem[] = [
  ...bottomRow,
  ...rightCurve,
  ...middleRow,
  ...middleExtra,
  ...topRow,
  ...infoBooth,
];

export const RESERVABLE_STAND_IDS = STAND_LAYOUT.filter(
  (s) => s.reservable
).map((s) => s.id);

// Elementos puramente decorativos (árboles), no interactivos.
export const DECORATIVE_TREES = [
  { x: 280, y: 415, r: 11 },
  { x: 480, y: 415, r: 11 },
  { x: 680, y: 415, r: 11 },
];
