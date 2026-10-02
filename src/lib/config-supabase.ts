/** Configuración compartida entre el navegador y el servidor (sin dependencias de pantalla). */

export const URL_SUPABASE =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
  "https://lnsbyugcqpognfuaujoe.supabase.co";

/** Clave "publishable": pública por diseño; la seguridad la dan las políticas RLS de la base. */
export const CLAVE_PUBLICA =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
  "sb_publishable_nFkwuac8ZEl5ZHqVrGWFHQ_TfXJsk_f";

/** Negocio que se muestra en direcciones de desarrollo y de prueba (localhost, *.vercel.app). */
export const NEGOCIO_PRINCIPAL =
  (import.meta.env["VITE_NEGOCIO_SLUG"] as string | undefined) || "resto-demo";

/** Direcciones donde se puede probar cualquier negocio con ?negocio=slug y se cae al principal. */
export function esDireccionDePrueba(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app");
}
