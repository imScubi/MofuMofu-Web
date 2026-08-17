/**
 * La dirección pública del sitio.
 *
 * Google necesita URLs absolutas para el canonical, el sitemap y las
 * imágenes de vista previa; en un dominio equivocado esas etiquetas
 * apuntan a ningún lado. Se puede sobrescribir con NEXT_PUBLIC_SITE_URL
 * (útil en pruebas o si algún día cambia el dominio) sin tocar código.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mofumofumarket.com"
).replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
