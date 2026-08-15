import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// El primario conserva la sombra sólida que se hunde al presionar,
// ahora con el rosa oscuro que sí contrasta contra el blanco.
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-pink-500 text-white shadow-[0_4px_0_0_var(--color-pink-700),0_10px_18px_-10px_rgba(163,36,80,0.55)] hover:bg-pink-600 active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--color-pink-700)]",
  secondary:
    "bg-white text-pink-700 border-2 border-pink-300 shadow-[0_2px_0_0_var(--color-pink-100)] hover:bg-pink-50 hover:border-pink-500 active:translate-y-[2px] active:shadow-none",
  ghost: "bg-transparent text-ink-soft hover:bg-pink-50 hover:text-pink-700",
  danger:
    "bg-danger-50 text-danger-600 border-2 border-danger-600/25 hover:bg-danger-600 hover:text-white hover:border-danger-600",
};

// Altura mínima de 44px: por debajo de eso el dedo falla en móvil.
const sizeClasses: Record<Size, string> = {
  md: "px-6 py-3 text-[15px] min-h-[44px]",
  lg: "px-8 py-4 text-[17px] min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "font-heading font-bold rounded-full transition-all duration-150 cursor-pointer select-none inline-flex items-center justify-center gap-2",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
          "disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
