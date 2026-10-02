/**
 * Aviso al celular del chef cuando entra un pedido, enviado DESDE EL SERVIDOR a ntfy.sh.
 *
 * Por qué en el servidor: el tema de ntfy es el "secreto" de los avisos. Antes viajaba dentro del
 * código del navegador (cualquiera podía verlo y mandarte avisos falsos). Acá se lee de variables de
 * entorno del servidor y nunca llega al navegador.
 *
 * Configuración (Vercel → Settings → Environment Variables):
 *  - NTFY_TOPIC            tema del negocio principal (también se acepta el viejo VITE_NTFY_TOPIC).
 *  - NTFY_TOPICS           opcional, un tema por restaurante: {"la-parrilla":"tema-secreto"}.
 *  - NTFY_URL              opcional, otro servidor ntfy (por defecto https://ntfy.sh).
 * Sin tema para ese negocio no se envía nada.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { CLAVE_PUBLICA, NEGOCIO_PRINCIPAL, URL_SUPABASE } from "@/lib/config-supabase";

export type AvisoPedido = {
  slug: string;
  id: string;
  anfitrion: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  lugar: string;
  cantidad: string;
  presupuesto: string;
  comentario: string;
  /** Teléfono del cliente en formato wa.me, para el botón "WhatsApp". */
  whatsappCliente: string;
};

const LARGOS: Record<Exclude<keyof AvisoPedido, "slug" | "id">, number> = {
  anfitrion: 80,
  telefono: 30,
  servicio: 60,
  fecha: 60,
  hora: 8,
  lugar: 80,
  cantidad: 40,
  presupuesto: 30,
  comentario: 300,
  whatsappCliente: 20,
};

/** Valida y limpia lo que manda el navegador: nada de lo recibido se usa sin pasar por acá. */
export function validarAviso(entrada: unknown): AvisoPedido {
  if (typeof entrada !== "object" || entrada === null) throw new Error("Aviso inválido");
  const e = entrada as Record<string, unknown>;
  const slug = typeof e["slug"] === "string" ? e["slug"].trim().toLowerCase() : "";
  const id = typeof e["id"] === "string" ? e["id"].trim() : "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60)
    throw new Error("Negocio inválido");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Pedido inválido");
  }
  const campos = {} as Record<string, string>;
  for (const [k, max] of Object.entries(LARGOS)) {
    const v = e[k];
    campos[k] = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  }
  campos["whatsappCliente"] = (campos["whatsappCliente"] ?? "").replace(/\D/g, "");
  return { slug, id, ...campos } as AvisoPedido;
}

type Entorno = Record<string, string | undefined>;

function entorno(): Entorno {
  return (globalThis as { process?: { env?: Entorno } }).process?.env ?? {};
}

/** Tema de ntfy de un negocio: el suyo en NTFY_TOPICS o, si es el principal, NTFY_TOPIC. */
export function temaDelNegocio(slug: string, env: Entorno = entorno()): string | null {
  try {
    const porNegocio = env["NTFY_TOPICS"]
      ? (JSON.parse(env["NTFY_TOPICS"]) as Record<string, string>)
      : {};
    const propio = porNegocio[slug]?.trim();
    if (propio) return propio;
  } catch {
    // NTFY_TOPICS mal escrito: se ignora y se sigue con el tema general.
  }
  if (slug !== NEGOCIO_PRINCIPAL) return null;
  return (env["NTFY_TOPIC"] || env["VITE_NTFY_TOPIC"] || "").trim() || null;
}

/** Arma la notificación: título claro, datos del pedido, ícono y botones. */
export function armarNotificacion(a: AvisoPedido, tema: string, origen: string) {
  const lineas = [
    `${a.anfitrion} · ${a.telefono}`,
    [a.fecha, a.hora, a.lugar].filter(Boolean).join(" · "),
    [a.cantidad, a.presupuesto].filter(Boolean).join(" · "),
    ...(a.comentario ? [`“${a.comentario}”`] : []),
  ].filter(Boolean);
  const acciones: object[] = [
    { action: "view", label: "Abrir panel", url: `${origen}/`, clear: true },
  ];
  if (a.whatsappCliente) {
    acciones.push({
      action: "view",
      label: "WhatsApp al cliente",
      url: `https://wa.me/${a.whatsappCliente}`,
      clear: true,
    });
  }
  return {
    topic: tema,
    title: `🍽️ Pedido nuevo: ${a.servicio}`,
    message: lineas.join("\n"),
    priority: 4,
    tags: ["bell"],
    icon: `${origen}/icono-aviso.png`,
    click: `${origen}/`,
    actions: acciones,
  };
}

// Un mismo pedido no avisa dos veces (doble clic, reintento del navegador).
const yaAvisados = new Set<string>();
const MAX_RECORDADOS = 500;

function recordar(id: string) {
  yaAvisados.add(id);
  if (yaAvisados.size > MAX_RECORDADOS)
    yaAvisados.delete(yaAvisados.values().next().value as string);
}

async function pedidoPendienteExiste(id: string): Promise<boolean> {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/estado_solicitudes`, {
    method: "POST",
    headers: {
      apikey: CLAVE_PUBLICA,
      Authorization: `Bearer ${CLAVE_PUBLICA}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_ids: [id] }),
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) return false;
  const filas = (await r.json()) as { id: string; estado: string }[];
  return filas.some((f) => f.id === id && f.estado === "pendiente");
}

export type ResultadoAviso = { enviado: boolean; motivo?: string };

export const avisarPedido = createServerFn({ method: "POST" })
  .validator((datos: unknown) => validarAviso(datos))
  .handler(async ({ data }): Promise<ResultadoAviso> => {
    try {
      const tema = temaDelNegocio(data.slug);
      if (!tema) return { enviado: false, motivo: "sin-tema" };
      if (yaAvisados.has(data.id)) return { enviado: false, motivo: "repetido" };
      // Solo se avisa de pedidos que existen de verdad en la base y siguen pendientes.
      if (!(await pedidoPendienteExiste(data.id))) return { enviado: false, motivo: "no-existe" };
      recordar(data.id);

      const pedido = getRequest();
      const url = new URL(pedido.url);
      const hostCrudo = (
        pedido.headers.get("x-forwarded-host") ??
        pedido.headers.get("host") ??
        url.host
      )
        .split(",")[0]!
        .trim();
      const proto = pedido.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
      const base = (entorno()["NTFY_URL"] || "https://ntfy.sh").replace(/\/$/, "");

      const r = await fetch(base, {
        method: "POST",
        body: JSON.stringify(armarNotificacion(data, tema, `${proto}://${hostCrudo}`)),
        signal: AbortSignal.timeout(4000),
      });
      return r.ok ? { enviado: true } : { enviado: false, motivo: `ntfy-${r.status}` };
    } catch {
      // El aviso es un extra: si falla, el pedido ya quedó guardado y no se molesta al cliente.
      return { enviado: false, motivo: "error" };
    }
  });
