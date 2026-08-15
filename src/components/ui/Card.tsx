import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-white rounded-3xl shadow-[0_8px_24px_-8px_rgba(255,126,182,0.25)] border border-pink-100",
        className
      )}
      {...props}
    />
  );
}
