import { HTMLAttributes } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Borde lavanda de 2px. Se usa una sola vez en el sitio: el paso de pago. */
  tone?: "normal" | "pago";
}

const toneClasses = {
  normal:
    "border border-pink-100 shadow-[0_2px_0_0_var(--color-pink-100),0_18px_40px_-24px_rgba(163,36,80,0.28)]",
  pago: "border-2 border-lavender-300 shadow-[0_2px_0_0_var(--color-lavender-300),0_20px_44px_-24px_rgba(107,75,196,0.3)]",
} as const;

export function Card({ className, tone = "normal", ...props }: CardProps) {
  return (
    <div
      className={clsx("bg-white rounded-[28px]", toneClasses[tone], className)}
      {...props}
    />
  );
}
