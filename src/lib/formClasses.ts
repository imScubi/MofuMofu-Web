// Clases compartidas de formulario. Estaban duplicadas en tres
// archivos; centralizarlas evita que el rediseño se aplique a medias.
//
// Borde de 2px en vez de 1px: en pantalla chica y con luz de sol, un
// borde rosa de 1px no se ve. Texto a 16px: por debajo de eso iOS hace
// zoom al enfocar el campo.

export const inputClass =
  "w-full min-h-[48px] rounded-2xl border-2 border-pink-100 bg-white px-4 py-3 text-[16px] text-ink placeholder:text-ink-soft/55 transition-colors hover:border-pink-300 focus:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-100";

export const inputErrorClass =
  "border-danger-600 bg-danger-50 focus:border-danger-600 focus:ring-danger-600/15";

export const labelClass = "mb-1.5 block text-sm font-bold leading-tight text-ink";

export const helpClass = "mt-1.5 text-[13.5px] text-ink-soft";

export const errorMsgClass =
  "mt-1.5 flex items-start gap-1.5 text-[13.5px] font-semibold text-danger-600";

export const fileInputClass = `${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-pink-100 file:px-4 file:py-2 file:text-sm file:font-bold file:text-pink-700 hover:file:bg-pink-300`;

/** Caja de error de un formulario completo (no de un campo). */
export const formErrorBoxClass =
  "rounded-2xl bg-danger-50 border border-danger-600/25 px-4 py-2.5 text-[13.5px] font-semibold text-danger-600";
