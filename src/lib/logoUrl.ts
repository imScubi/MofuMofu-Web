/**
 * URL pública del logo de un negocio.
 *
 * Vive aparte de uploadLogo.ts porque ese archivo es "server-only" (usa
 * la service role key) y esto lo necesitan también el panel y el plan,
 * que corren en el navegador.
 */
export function logoPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/business-logos/${path}`;
}
