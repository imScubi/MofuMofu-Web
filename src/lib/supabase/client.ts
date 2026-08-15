import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente público (anon key): lectura de stands + suscripción realtime.
// Seguro de usar tanto en el navegador como en componentes de servidor,
// no maneja sesiones de usuario.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
