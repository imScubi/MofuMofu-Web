/**
 * Los días que dura una edición, como fechas "YYYY-MM-DD".
 *
 * El plan logístico es por día: el mismo número de stand puede tener un
 * negocio el sábado y otro el domingo, así que todo lo que se imprime
 * necesita saber de qué día habla.
 */
export function eventDays(dateStart: string, dateEnd: string): string[] {
  const days: string[] = [];
  const cursor = new Date(dateStart + "T00:00:00");
  const end = new Date(dateEnd + "T00:00:00");

  // Un tope duro evita un ciclo infinito si alguna edición quedara con
  // la fecha de fin antes que la de inicio.
  for (let i = 0; cursor <= end && i < 14; i++) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * "Sábado 15 de agosto".
 *
 * Sin la coma que mete el formato de es-MX ("sábado, 15 de agosto"):
 * los encabezados del plan se leen mejor sin ella, y así queda igual
 * que el documento que ya se manda a la sede.
 */
export function formatDayLong(day: string): string {
  const text = new Date(day + "T00:00:00")
    .toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    .replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Sábado 15" — para encabezados de tabla, donde el mes sobra. */
export function formatDayShort(day: string): string {
  const text = new Date(day + "T00:00:00")
    .toLocaleDateString("es-MX", { weekday: "long", day: "numeric" })
    .replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
