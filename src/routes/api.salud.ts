import { createFileRoute } from "@tanstack/react-router";
import { CLAVE_PUBLICA, URL_SUPABASE } from "@/lib/config-supabase";

/**
 * Chequeo de salud: devuelve 200 si la aplicación y la base responden, 503 si la base no responde.
 * Sirve para monitoreo (por ejemplo UptimeRobot, gratis) o para mirarlo a mano en /api/salud.
 * No expone ningún dato: solo el estado.
 */
export const Route = createFileRoute("/api/salud")({
  server: {
    handlers: {
      GET: async () => {
        const inicio = Date.now();
        let base = false;
        try {
          const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/negocio_por_dominio`, {
            method: "POST",
            headers: {
              apikey: CLAVE_PUBLICA,
              Authorization: `Bearer ${CLAVE_PUBLICA}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ p_dominio: "salud.invalid" }),
            signal: AbortSignal.timeout(4000),
          });
          // 200 = la función responde; 404 PGRST202 = base sin la migración 0004, pero la base está viva.
          base = r.ok || r.status === 404;
        } catch {
          base = false;
        }
        return new Response(JSON.stringify({ app: true, base, ms: Date.now() - inicio }), {
          status: base ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
