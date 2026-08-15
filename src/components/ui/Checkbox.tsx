import { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  children: ReactNode;
  /** Se muestra sólo cuando está deshabilitada: explica por qué no se puede marcar. */
  disabledHint?: string;
}

// La palomita va como imagen de fondo del propio input (appearance-none),
// para que el cuadro se pueda estilizar sin envolverlo en más elementos.
const CHECK_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.2 8.6l3 3L12.8 5' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" stroke="currentColor" strokeWidth={1.6} />
      <path
        d="M5.6 7V5.4a2.4 2.4 0 014.8 0V7"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Checkbox({ children, disabledHint, className, ...props }: CheckboxProps) {
  const isDisabled = props.disabled;

  return (
    <label
      className={clsx(
        "flex items-start gap-3.5 rounded-[18px] bg-pink-50 p-4 transition-colors",
        "has-[:checked]:bg-mint-100 has-[:checked]:ring-2 has-[:checked]:ring-mint-300",
        isDisabled
          ? "cursor-not-allowed border border-dashed border-gray-500/40 bg-[#F6F0F2]"
          : "cursor-pointer",
        className
      )}
    >
      <span className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className={clsx(
            "peer h-6 w-6 shrink-0 appearance-none rounded-lg border-2 border-pink-300 bg-white transition-all",
            "checked:border-pink-600 checked:bg-pink-600 checked:bg-[length:14px] checked:bg-center checked:bg-no-repeat",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-100",
            "disabled:cursor-not-allowed disabled:border-gray-500/45 disabled:bg-pink-50/60"
          )}
          style={{ backgroundImage: props.checked ? CHECK_SVG : undefined }}
          {...props}
        />
        {isDisabled && (
          <span className="pointer-events-none absolute text-gray-500">
            <LockIcon />
          </span>
        )}
      </span>
      <span>
        <span
          className={clsx(
            "block text-[14.5px] font-bold leading-relaxed",
            isDisabled ? "text-gray-500" : "text-ink"
          )}
        >
          {children}
        </span>
        {isDisabled && disabledHint && (
          <span className="mt-1 block text-[13px] font-semibold leading-snug text-amber-500">
            {disabledHint}
          </span>
        )}
      </span>
    </label>
  );
}
