"use client";

/**
 * Achica una imagen antes de subirla.
 *
 * Una foto de comprobante tomada con el celular pesa 4 u 8 MB y mide
 * 4000px de ancho; para leer un número de referencia sobran 1600. Sin
 * esto el expositor sube por datos móviles diez veces más de lo que
 * hace falta, y el servidor recibe un archivo que nadie va a mirar a
 * tamaño completo.
 *
 * Sólo toca imágenes de mapa de bits. Un PDF o un SVG pasan intactos:
 * no son cosas que se puedan redibujar en un canvas sin romperlas.
 */

const RESIZABLE = ["image/jpeg", "image/png", "image/webp"];

export interface CompressOptions {
  /** Lado mayor máximo, en píxeles. */
  maxSide?: number;
  /** Por debajo de esto no vale la pena recomprimir. */
  skipUnderBytes?: number;
  quality?: number;
  /**
   * Conserva la transparencia (sale PNG en vez de JPEG). Un logo la
   * necesita: se coloca sobre el mapa y sobre el plan logístico, y con
   * fondo blanco se vería como una calcomanía recortada.
   */
  keepAlpha?: boolean;
}

export async function compressImage(
  file: File,
  {
    maxSide = 1800,
    skipUnderBytes = 600 * 1024,
    quality = 0.82,
    keepAlpha = false,
  }: CompressOptions = {}
): Promise<File> {
  if (!RESIZABLE.includes(file.type)) return file;
  if (file.size <= skipUnderBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Un archivo que el navegador no puede decodificar se sube tal cual
    // y que el servidor decida: mejor eso que perder el registro aquí.
    return file;
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  if (!keepAlpha) {
    // Sin este relleno, lo transparente sale negro al pasar a JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = keepAlpha ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );
  // Recomprimir no siempre gana: un PNG ya optimizado puede salir más
  // pesado, y entonces lo mejor es dejar el original en paz.
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + (keepAlpha ? ".png" : ".jpg");
  return new File([blob], name, { type, lastModified: Date.now() });
}
