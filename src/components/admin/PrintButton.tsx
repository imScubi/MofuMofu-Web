"use client";

import { Button } from "@/components/ui/Button";

/**
 * Imprimir el plan. En el diálogo del navegador se elige "Guardar como
 * PDF" y eso es lo que se le manda a la sede — sin generar el PDF en el
 * servidor, que además saldría con otras fuentes.
 */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      Imprimir o guardar PDF
    </Button>
  );
}
