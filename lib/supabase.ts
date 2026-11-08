import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** true cuando ya están cargadas las dos variables de Supabase. */
export const configurado = Boolean(url && key);

let _sb: SupabaseClient | null = null;

/** Cliente de servicio (server-only): escribe sin RLS, como dtup-web. */
export function sb(): SupabaseClient {
  if (!configurado) throw new Error("SUPABASE_NO_CONFIGURADO");
  if (!_sb) {
    _sb = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _sb;
}
