/** "6:00 PM" — el formato en el que está escrito el plan de la sede. */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "6:00 PM - 7:00 PM", o sólo la hora de inicio si no hay fin. */
export function formatTimeRange(start: string, end: string | null): string {
  return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
}
