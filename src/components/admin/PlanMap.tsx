import Image from "next/image";
import {
  MAP_IMAGE_HEIGHT,
  MAP_IMAGE_SRC,
  MAP_IMAGE_WIDTH,
  STAND_LAYOUT,
} from "@/lib/standLayout";
import { logoPublicUrl } from "@/lib/logoUrl";
import type { RegistrationRow } from "@/lib/types";

/**
 * El mapa del día para el plan logístico: cada stand ocupado lleva el
 * logo del negocio con su número encima, y los libres se ven vacíos.
 *
 * Usa las mismas coordenadas que el mapa público (un solo lugar donde
 * calibrar) y se imprime tal cual: por eso los colores van con
 * print-color-adjust, o el navegador los borra al imprimir.
 */
export function PlanMap({
  registrationsByStand,
}: {
  registrationsByStand: Map<string, RegistrationRow>;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-pink-100 bg-white"
      style={{
        aspectRatio: `${MAP_IMAGE_WIDTH} / ${MAP_IMAGE_HEIGHT}`,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <Image
        src={MAP_IMAGE_SRC}
        alt="Plano del evento"
        fill
        sizes="(max-width: 768px) 100vw, 1000px"
        className="object-contain opacity-60 grayscale"
      />

      {STAND_LAYOUT.map((stand) => {
        const registration = stand.reservable
          ? registrationsByStand.get(stand.id)
          : undefined;
        const logo = logoPublicUrl(registration?.logo_path);

        return (
          <div
            key={stand.id}
            className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-[4px] border ${
              registration
                ? "border-pink-600 bg-white"
                : stand.reservable
                  ? "border-dashed border-gray-500/50 bg-white/60"
                  : "border-lavender-300 bg-lavender-100"
            }`}
            style={{
              left: `${(stand.x / MAP_IMAGE_WIDTH) * 100}%`,
              top: `${(stand.y / MAP_IMAGE_HEIGHT) * 100}%`,
              width: `${(stand.size / MAP_IMAGE_WIDTH) * 100}%`,
              height: `${(stand.size / MAP_IMAGE_HEIGHT) * 100}%`,
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
            }}
            title={
              registration
                ? `${stand.id} — ${registration.business_name}`
                : `Stand ${stand.id} libre`
            }
          >
            {logo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain p-[1px]"
                />
                <span className="absolute bottom-0 right-0 rounded-tl-[4px] bg-pink-600 px-[3px] text-[7px] font-bold leading-[1.4] text-white">
                  {stand.id}
                </span>
              </>
            ) : (
              <span
                className={`text-[9px] font-bold ${
                  registration ? "text-pink-700" : "text-ink-soft"
                }`}
              >
                {stand.id}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
