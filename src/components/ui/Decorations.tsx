/**
 * Formas de marca en SVG inline. Sustituyen a los emoji (🎀 🌸 🎉), que
 * se ven distintos en cada teléfono, y a los blobs borrosos del hero.
 * Todo es decorativo: aria-hidden y sin eventos de puntero.
 */

interface ShapeProps {
  className?: string;
}

export function FlowerShape({ className }: ShapeProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M20 4c2.4 0 4 1.7 4 4.1 2.6-1 5.3.1 6.4 2.4 1.1 2.3.2 5-2 6.3 2.2 1.3 3.1 4 2 6.3-1.1 2.3-3.8 3.4-6.4 2.4 0 2.4-1.6 4.1-4 4.1s-4-1.7-4-4.1c-2.6 1-5.3-.1-6.4-2.4-1.1-2.3-.2-5 2-6.3-2.2-1.3-3.1-4-2-6.3C10.7 8.2 13.4 7.1 16 8.1 16 5.7 17.6 4 20 4z"
        fill="var(--color-pink-100)"
      />
      <circle cx="20" cy="17" r="5.4" fill="var(--color-pink-300)" />
    </svg>
  );
}

export function HeartShape({ className }: ShapeProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M20 33s-11-6.6-11-14.2A6.1 6.1 0 0120 15.6 6.1 6.1 0 0131 18.8C31 26.4 20 33 20 33z"
        fill="var(--color-pink-300)"
      />
    </svg>
  );
}

export function StarShape({ className }: ShapeProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path
        d="M20 6l3 8.4 8.9.3-7 5.5 2.5 8.6L20 23.9l-7.4 4.9 2.5-8.6-7-5.5 8.9-.3z"
        fill="var(--color-lavender-300)"
      />
    </svg>
  );
}

/**
 * Onda de parque: separa secciones de la landing. Con `flip` se voltea
 * para usarse como borde superior.
 */
export function ParkWave({
  className,
  flip,
}: ShapeProps & { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 150"
      preserveAspectRatio="none"
      className={`${className ?? ""} ${flip ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M0 118c26 0 34-16 58-16s30 14 54 14 30-18 56-18 34 20 58 20 32-14 54-14 26 8 40 8v38H0z"
        fill="var(--color-mint-100)"
      />
      <path
        d="M0 130c30 0 36-12 60-12s32 12 56 12 32-14 58-14 34 16 58 16 30-10 48-10v28H0z"
        fill="var(--color-mint-300)"
        opacity="0.75"
      />
      <circle cx="58" cy="96" r="7" fill="var(--color-pink-300)" />
      <circle cx="212" cy="88" r="5" fill="var(--color-pink-100)" />
      <circle cx="268" cy="102" r="8" fill="var(--color-pink-300)" opacity="0.7" />
    </svg>
  );
}
