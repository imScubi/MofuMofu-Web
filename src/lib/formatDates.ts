/** "24 y 25 de octubre de 2026", o una sola fecha si el evento dura un día. */
export function formatEventDates(dateStart: string, dateEnd: string): string {
  const start = new Date(dateStart + "T00:00:00");
  const end = new Date(dateEnd + "T00:00:00");

  const full = (d: Date) =>
    d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  if (dateStart === dateEnd) return full(start);

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()} y ${end.getDate()} de ${end.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `${full(start)} — ${full(end)}`;
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
