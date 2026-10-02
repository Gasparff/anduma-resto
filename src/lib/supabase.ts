/**
 * Conexión con Supabase y resolución del negocio.
 *
 * La URL y la clave "publishable" son públicas por diseño (viajan al navegador en cualquier app
 * de Supabase); la seguridad la dan las políticas RLS de la base, no el secreto de esta clave.
 * Se pueden pisar con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 *
 * Una sola plataforma sirve a varios restaurantes. Cada uno se muestra según la dirección web
 * (`negocio_por_dominio`) y la pantalla no deja rastros de los demás. La app decide sola si usa la
 * base o el modo demostración (localStorage): solo pasa a la base cuando el negocio ya existe.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { configDesdeRespuesta, type RespuestaNegocio } from "@/lib/config-negocio";
import {
  CLAVE_PUBLICA,
  NEGOCIO_PRINCIPAL,
  URL_SUPABASE,
  esDireccionDePrueba,
} from "@/lib/config-supabase";
import { aplicarConfigNegocio } from "@/lib/eventos";
import { aplicarMarca } from "@/lib/marca";

export { NEGOCIO_PRINCIPAL };

const CLAVE_FUNCIONO_ANTES = "anduma-backend-ok";
const PREFIJO_CACHE = "anduma-negocio:";

let cliente: SupabaseClient | null = null;
let slugActivo = NEGOCIO_PRINCIPAL;

export function supabase(): SupabaseClient {
  cliente ??= createClient(URL_SUPABASE, CLAVE_PUBLICA, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cliente;
}

/** Slug del negocio que corresponde a esta dirección web (se resuelve al arrancar). */
export function slugDelNegocio() {
  return slugActivo;
}

/**
 * - cargando: todavía se está resolviendo.
 * - remoto: hay base y el negocio existe.
 * - local: modo demostración (la base todavía no está instalada).
 * - noencontrado: esta dirección no corresponde a ningún negocio.
 * - sinconexion: no se pudo cargar y no hay nada guardado de una visita anterior.
 */
export type ModoBackend = "cargando" | "remoto" | "local" | "noencontrado" | "sinconexion";

type ErrorBase = { message?: string; code?: string } | null;

/** ¿Falta instalar el esquema o la función (y no es un problema de red)? */
function faltaConfigurar(error: ErrorBase) {
  const c = error?.code ?? "";
  return c === "PGRST205" || c === "PGRST202" || c === "42P01" || c === "42883";
}

function leer(clave: string) {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: string) {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

function aplicar(respuesta: RespuestaNegocio) {
  const config = configDesdeRespuesta(respuesta);
  aplicarConfigNegocio(config);
  aplicarMarca(config.negocio);
}

type Resolucion = { slug: string } | "noencontrado" | "falla" | "sin-funciones";

async function resolverSlug(host: string): Promise<Resolucion> {
  const prueba = esDireccionDePrueba(host);
  const pedido = new URLSearchParams(window.location.search).get("negocio")?.trim().toLowerCase();
  if (prueba && pedido) return { slug: pedido };

  const { data, error } = await supabase().rpc("negocio_por_dominio", { p_dominio: host });
  if (error) return faltaConfigurar(error) ? "sin-funciones" : "falla";
  if (typeof data === "string" && data) return { slug: data };
  return prueba ? { slug: NEGOCIO_PRINCIPAL } : "noencontrado";
}

/** Camino de respaldo para bases sin la migración 0004: un único negocio, con los datos de siempre. */
async function sondearSinMultinegocio(): Promise<ModoBackend> {
  const { data, error } = await supabase()
    .from("negocios")
    .select("id")
    .eq("slug", NEGOCIO_PRINCIPAL)
    .maybeSingle();
  if (error) return faltaConfigurar(error) ? "local" : "sinconexion";
  if (!data) return "local";
  slugActivo = NEGOCIO_PRINCIPAL;
  guardar(CLAVE_FUNCIONO_ANTES, "1");
  return "remoto";
}

async function sondearUnaVez(host: string): Promise<ModoBackend | "reintentar"> {
  try {
    const r = await resolverSlug(host);
    if (r === "noencontrado") return "noencontrado";
    if (r === "sin-funciones") return await sondearSinMultinegocio();
    if (r === "falla") return "reintentar";

    const { data, error } = await supabase().rpc("obtener_negocio", { p_slug: r.slug });
    if (error) return faltaConfigurar(error) ? await sondearSinMultinegocio() : "reintentar";
    if (!data)
      return esDireccionDePrueba(host) && r.slug === NEGOCIO_PRINCIPAL ? "local" : "noencontrado";

    slugActivo = r.slug;
    aplicar(data as RespuestaNegocio);
    guardar(PREFIJO_CACHE + host, JSON.stringify({ slug: r.slug, respuesta: data }));
    guardar(CLAVE_FUNCIONO_ANTES, "1");
    return "remoto";
  } catch {
    return "reintentar";
  }
}

async function sondear(): Promise<ModoBackend> {
  const host = window.location.hostname.toLowerCase();
  for (let intento = 0; intento < 3; intento++) {
    const modo = await sondearUnaVez(host);
    if (modo !== "reintentar") return modo;
    await new Promise((r) => setTimeout(r, 1200));
  }
  // Sin conexión: se usa lo guardado de la última visita a esta dirección, si hay.
  const guardado = leer(PREFIJO_CACHE + host);
  if (guardado) {
    try {
      const { slug, respuesta } = JSON.parse(guardado) as {
        slug: string;
        respuesta: RespuestaNegocio;
      };
      slugActivo = slug;
      aplicar(respuesta);
      return "remoto";
    } catch {
      // Lo guardado está dañado: se ignora.
    }
  }
  return esDireccionDePrueba(host) && leer(CLAVE_FUNCIONO_ANTES) !== "1" ? "local" : "sinconexion";
}

let sonda: Promise<ModoBackend> | null = null;
let modoResuelto: ModoBackend = "cargando";
const oyentes = new Set<(m: ModoBackend) => void>();

/** Resuelve una sola vez (por carga de página) qué negocio y qué modo corresponden. */
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
