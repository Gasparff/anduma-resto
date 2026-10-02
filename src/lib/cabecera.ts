/**
 * Título, descripción e ícono de la página según la dirección web, generados en el SERVIDOR para
 * que ya vengan en el HTML inicial (pestaña, vistas previas de enlaces en WhatsApp o redes).
 * Si algo falla o la dirección no corresponde a un negocio, devuelve null y la página sale con un
 * encabezado neutro: nunca con el de otro restaurante.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  CLAVE_PUBLICA,
  NEGOCIO_PRINCIPAL,
  URL_SUPABASE,
  esDireccionDePrueba,
} from "@/lib/config-supabase";

export type Cabecera = {
  nombre: string;
  descripcion: string | null;
  /** Ícono de la pestaña (favicon o, si no tiene, el logo). */
  icono: string | null;
  /** Imagen para las vistas previas de enlaces (dirección completa). */
  imagen: string | null;
};

type Rpc = { negocio?: Record<string, string | null> } | string | null;

async function llamar(funcion: string, cuerpo: Record<string, string>): Promise<Rpc> {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${funcion}`, {
    method: "POST",
    headers: {
      apikey: CLAVE_PUBLICA,
      Authorization: `Bearer ${CLAVE_PUBLICA}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) return null;
  return (await r.json()) as Rpc;
}

function absoluta(ruta: string | null | undefined, origen: string) {
  if (!ruta) return null;
  try {
    return new URL(ruta, origen).toString();
  } catch {
    return null;
  }
}

// Evita repetir las dos consultas en cada visita: un minuto de memoria por dirección.
const MEMORIA_MS = 60_000;
const memoria = new Map<string, { hasta: number; valor: Cabecera | null }>();

export const cargarCabecera = createServerFn({ method: "GET" }).handler(
  async (): Promise<Cabecera | null> => {
    try {
      const pedido = getRequest();
      const url = new URL(pedido.url);
      const hostCrudo =
        pedido.headers.get("x-forwarded-host") ?? pedido.headers.get("host") ?? url.host;
      const host = hostCrudo.split(",")[0]!.trim().split(":")[0]!.toLowerCase();
      const prueba = esDireccionDePrueba(host);
      const pedidoSlug = prueba ? url.searchParams.get("negocio")?.trim().toLowerCase() : null;

      const clave = `${host}|${pedidoSlug ?? ""}`;
      const guardado = memoria.get(clave);
      if (guardado && guardado.hasta > Date.now()) return guardado.valor;

      let slug = pedidoSlug || null;
      if (!slug) {
        const porDominio = await llamar("negocio_por_dominio", { p_dominio: host });
        slug = typeof porDominio === "string" && porDominio ? porDominio : null;
      }
      if (!slug && prueba) slug = NEGOCIO_PRINCIPAL;

      let valor: Cabecera | null = null;
      if (slug) {
        const r = await llamar("obtener_negocio", { p_slug: slug });
        const n = r && typeof r === "object" ? r.negocio : undefined;
        if (n?.["nombre"]) {
          const proto = pedido.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
          const origen = `${proto}://${hostCrudo.split(",")[0]!.trim()}`;
          const icono = n["favicon_url"] || n["logo_url"] || null;
          valor = {
            nombre: n["nombre"],
            descripcion: n["descripcion"]?.trim() || null,
            icono: absoluta(icono, origen),
            imagen: absoluta(n["logo_url"], origen),
          };
        }
      }
      memoria.set(clave, { hasta: Date.now() + MEMORIA_MS, valor });
      return valor;
    } catch {
      return null;
    }
  },
);

/** Etiquetas de la cabecera para un negocio, o neutras si no se pudo determinar. */
export function cabeceraDe(c: Cabecera | null | undefined) {
  if (!c) {
    return { meta: [{ title: "Reservas" }], links: [] as { rel: string; href: string }[] };
  }
  const titulo = `${c.nombre} — Eventos y viandas`;
  return {
    meta: [
      { title: titulo },
      ...(c.descripcion ? [{ name: "description", content: c.descripcion }] : []),
      { property: "og:title", content: titulo },
      ...(c.descripcion ? [{ property: "og:description", content: c.descripcion }] : []),
      { property: "og:type", content: "website" },
      ...(c.imagen ? [{ property: "og:image", content: c.imagen }] : []),
    ],
    links: c.icono
      ? [
          { rel: "icon", href: c.icono },
          { rel: "apple-touch-icon", href: c.icono },
        ]
      : [],
  };
}
