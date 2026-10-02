/**
 * Conexión con Supabase.
 *
 * La URL y la clave "publishable" son públicas por diseño (viajan al navegador en cualquier app
 * de Supabase); la seguridad la dan las políticas RLS de la base, no el secreto de esta clave.
 * Se pueden pisar con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 *
 * La app decide sola si usa la base o el modo demostración (localStorage): solo pasa a la base
 * cuando el negocio ya existe en ella. Mientras no se haya corrido el SQL de supabase/, sigue
 * funcionando en modo demostración y no se rompe nada.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const URL_POR_DEFECTO = "https://lnsbyugcqpognfuaujoe.supabase.co";
const CLAVE_PUBLICA_POR_DEFECTO = "sb_publishable_nFkwuac8ZEl5ZHqVrGWFHQ_TfXJsk_f";

export const NEGOCIO_SLUG =
  (import.meta.env["VITE_NEGOCIO_SLUG"] as string | undefined) || "resto-demo";

const CLAVE_FUNCIONO_ANTES = "anduma-backend-ok";

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  cliente ??= createClient(
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || URL_POR_DEFECTO,
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) || CLAVE_PUBLICA_POR_DEFECTO,
    { auth: { persistSession: true, autoRefreshToken: true } },
  );
  return cliente;
}

export type ModoBackend = "cargando" | "remoto" | "local";

type ErrorBase = { message?: string; code?: string } | null;

/** ¿El problema es que la base todavía no tiene el esquema o el negocio (y no la red)? */
function faltaConfigurar(error: ErrorBase) {
  const codigo = error?.code ?? "";
  return codigo === "PGRST205" || codigo === "42P01" || codigo === "PGRST202";
}

async function sondear(): Promise<ModoBackend> {
  const funcionoAntes = leerBandera();
  for (let intento = 0; intento < 3; intento++) {
    try {
      const { data, error } = await supabase()
        .from("negocios")
        .select("id")
        .eq("slug", NEGOCIO_SLUG)
        .maybeSingle();
      if (!error) {
        if (!data) return "local"; // esquema creado, pero falta cargar el negocio (seed.sql)
        guardarBandera();
        return "remoto";
      }
      if (faltaConfigurar(error)) return "local";
    } catch {
      // Sin red: reintentamos abajo.
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  // Sin conexión. Si la base ya funcionó en este dispositivo, no mostramos datos de demostración.
  return funcionoAntes ? "remoto" : "local";
}

function leerBandera() {
  try {
    return window.localStorage.getItem(CLAVE_FUNCIONO_ANTES) === "1";
  } catch {
    return false;
  }
}

function guardarBandera() {
  try {
    window.localStorage.setItem(CLAVE_FUNCIONO_ANTES, "1");
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

let sonda: Promise<ModoBackend> | null = null;
let modoResuelto: ModoBackend = "cargando";
const oyentes = new Set<(m: ModoBackend) => void>();

/** Resuelve una sola vez (por carga de página) si se usa la base o el modo demostración. */
export function resolverModo(): Promise<ModoBackend> {
  sonda ??= sondear().then((m) => {
    modoResuelto = m;
    oyentes.forEach((f) => f(m));
    return m;
  });
  return sonda;
}

export function useModoBackend(): ModoBackend {
  const [modo, setModo] = useState<ModoBackend>(modoResuelto);
  useEffect(() => {
    oyentes.add(setModo);
    void resolverModo().then(setModo);
    return () => {
      oyentes.delete(setModo);
    };
  }, []);
  return modo;
}
