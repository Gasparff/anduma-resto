/**
 * Acceso a los datos reales (Supabase). Todo lo que sale de acá devuelve los mismos tipos que
 * usa la app (Evento, Solicitud), así las pantallas no saben de dónde vienen los datos.
 */
import {
  SERVICIOS,
  type Datos,
  type Evento,
  type EstadoSolicitud,
  type SalonId,
  type ServicioId,
  type Solicitud,
} from "@/lib/eventos";
import { NEGOCIO_SLUG, supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Conversión base -> app (puras, con tests)                           */
/* ------------------------------------------------------------------ */

type Codigo = { codigo: string } | null;

export type FilaEvento = {
  id: string;
  fecha: string;
  nombre: string;
  personas: number;
  hora: string;
  anfitrion: string | null;
  servicios: Codigo;
  salones: Codigo;
};

export type FilaSolicitud = {
  id: string;
  anfitrion: string;
  telefono: string;
  fecha: string;
  hora: string;
  personas: number;
  comentario: string;
  dietas: string[];
  presupuesto: number | null;
  estado: "pendiente" | "confirmada" | "rechazada" | "cancelada";
  creada_en: string;
  servicios: Codigo;
  salones: Codigo;
};

/** La base guarda la hora como HH:MM:SS; la app la usa como HH:MM. */
export function horaCorta(hora: string) {
  return hora.slice(0, 5);
}

/** La base tiene "cancelada"; en la app se muestra como rechazada. */
export function estadoApp(estado: FilaSolicitud["estado"]): EstadoSolicitud {
  return estado === "cancelada" ? "rechazada" : estado;
}

export function eventoDesdeFila(f: FilaEvento): Evento {
  return {
    id: f.id,
    fecha: f.fecha,
    nombre: f.nombre,
    personas: f.personas,
    servicio: (f.servicios?.codigo ?? SERVICIOS[0]!.id) as ServicioId,
    hora: horaCorta(f.hora),
    salon: (f.salones?.codigo ?? undefined) as SalonId | undefined,
    ...(f.anfitrion ? { anfitrion: f.anfitrion } : {}),
  };
}

export function solicitudDesdeFila(f: FilaSolicitud): Solicitud {
  return {
    id: f.id,
    anfitrion: f.anfitrion,
    telefono: f.telefono,
    fecha: f.fecha,
    hora: horaCorta(f.hora),
    servicio: (f.servicios?.codigo ?? SERVICIOS[0]!.id) as ServicioId,
    salon: (f.salones?.codigo ?? undefined) as SalonId | undefined,
    personas: f.personas,
    comentario: f.comentario,
    dietas: f.dietas,
    presupuesto: f.presupuesto === null ? undefined : Number(f.presupuesto),
    estado: estadoApp(f.estado),
    creada: f.creada_en,
  };
}

/** Mensajes de error de Postgres/Supabase, en criollo. */
export function mensajeDeError(error: { message?: string } | null | undefined) {
  const m = error?.message ?? "";
  if (/Failed to fetch|NetworkError|fetch failed/i.test(m))
    return "No hay conexión. Probá de nuevo.";
  if (m) return m;
  return "No pudimos completar la operación. Probá de nuevo.";
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

/** Lo que ve el anfitrión: solo qué salón está ocupado qué día, nunca datos de otros clientes. */
export async function cargarOcupadas(): Promise<Evento[]> {
  const { data, error } = await supabase().rpc("fechas_ocupadas", { p_slug: NEGOCIO_SLUG });
  if (error) throw error;
  return ((data ?? []) as { fecha: string; salon_codigo: string }[]).map((o) => ({
    id: `ocupado-${o.fecha}-${o.salon_codigo}`,
    fecha: o.fecha,
    nombre: "Salón ocupado",
    personas: 0,
    servicio: SERVICIOS[0]!.id,
    hora: "",
    salon: o.salon_codigo as SalonId,
  }));
}

/** Panel del chef: requiere haber iniciado sesión (lo exige la base con RLS). */
export async function cargarPanelChef(): Promise<Datos> {
  const [ev, so] = await Promise.all([
    supabase()
      .from("eventos")
      .select("id, fecha, nombre, personas, hora, anfitrion, servicios(codigo), salones(codigo)")
      .order("fecha"),
    supabase()
      .from("solicitudes")
      .select(
        "id, anfitrion, telefono, fecha, hora, personas, comentario, dietas, presupuesto, estado, creada_en, servicios(codigo), salones(codigo)",
      )
      .order("creada_en", { ascending: false }),
  ]);
  if (ev.error) throw ev.error;
  if (so.error) throw so.error;
  return {
    eventos: ((ev.data ?? []) as unknown as FilaEvento[]).map(eventoDesdeFila),
    solicitudes: ((so.data ?? []) as unknown as FilaSolicitud[]).map(solicitudDesdeFila),
  };
}

/** Estado actual de los pedidos que hizo este dispositivo. */
export async function estadoDePedidos(ids: string[]): Promise<Map<string, EstadoSolicitud>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase().rpc("estado_solicitudes", { p_ids: ids });
  if (error) throw error;
  return new Map(
    ((data ?? []) as { id: string; estado: FilaSolicitud["estado"] }[]).map((r) => [
      r.id,
      estadoApp(r.estado),
    ]),
  );
}

/* ------------------------------------------------------------------ */
/* Escritura                                                           */
/* ------------------------------------------------------------------ */

export type NuevaSolicitud = Omit<Solicitud, "id" | "estado" | "creada">;

/** Crea el pedido en la base (valida cupo, capacidad y salón libre en el servidor). */
export async function crearSolicitudRemota(
  s: NuevaSolicitud,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase().rpc("crear_solicitud", {
    p_slug: NEGOCIO_SLUG,
    p_servicio: s.servicio,
    p_salon: s.salon ?? null,
    p_anfitrion: s.anfitrion,
    p_telefono: s.telefono,
    p_email: null,
    p_fecha: s.fecha,
    p_hora: s.hora,
    p_personas: s.personas,
    p_comentario: s.comentario,
    p_dietas: s.dietas ?? [],
  });
  if (error) return { error: mensajeDeError(error) };
  return { id: data as string };
}

export async function responderSolicitudRemota(
  id: string,
  estado: Exclude<EstadoSolicitud, "pendiente">,
): Promise<string | null> {
  const { error } = await supabase().rpc("responder_solicitud", {
    p_solicitud: id,
    p_estado: estado,
  });
  return error ? mensajeDeError(error) : null;
}

type Ids = { negocio: string; servicios: Map<string, string>; salones: Map<string, string> };
let idsCache: Promise<Ids> | null = null;

async function cargarIds(): Promise<Ids> {
  const cli = supabase();
  const { data: neg, error } = await cli
    .from("negocios")
    .select("id")
    .eq("slug", NEGOCIO_SLUG)
    .single();
  if (error) throw error;
  const [sv, sa] = await Promise.all([
    cli.from("servicios").select("id, codigo").eq("negocio_id", neg.id),
    cli.from("salones").select("id, codigo").eq("negocio_id", neg.id),
  ]);
  if (sv.error) throw sv.error;
  if (sa.error) throw sa.error;
  return {
    negocio: neg.id as string,
    servicios: new Map((sv.data ?? []).map((r) => [r.codigo as string, r.id as string])),
    salones: new Map((sa.data ?? []).map((r) => [r.codigo as string, r.id as string])),
  };
}

/** El chef agenda un evento a mano. El índice único de la base impide doble reserva. */
export async function agregarEventoRemoto(e: Omit<Evento, "id">): Promise<string | null> {
  try {
    idsCache ??= cargarIds();
    const ids = await idsCache;
    const { error } = await supabase()
      .from("eventos")
      .insert({
        negocio_id: ids.negocio,
        servicio_id: ids.servicios.get(e.servicio),
        salon_id: e.salon ? ids.salones.get(e.salon) : null,
        nombre: e.nombre,
        anfitrion: e.anfitrion ?? null,
        fecha: e.fecha,
        hora: e.hora,
        personas: e.personas,
      });
    if (error) {
      if (error.code === "23505") return "Ese salón ya tiene un evento ese día.";
      return mensajeDeError(error);
    }
    return null;
  } catch (err) {
    idsCache = null;
    return mensajeDeError(err as { message?: string });
  }
}

export async function eliminarEventoRemoto(id: string): Promise<string | null> {
  const { error } = await supabase().from("eventos").delete().eq("id", id);
  return error ? mensajeDeError(error) : null;
}

/* ------------------------------------------------------------------ */
/* Sesión del chef                                                     */
/* ------------------------------------------------------------------ */

/** ¿Hay una sesión iniciada cuyo usuario administra este negocio? */
export async function chefConSesion(): Promise<boolean> {
  const { data } = await supabase().auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return false;
  const { data: filas, error } = await supabase()
    .from("miembros")
    .select("usuario_id")
    .eq("usuario_id", uid)
    .limit(1);
  return !error && (filas?.length ?? 0) > 0;
}

/** Inicia sesión con correo y contraseña. Devuelve un mensaje si no se pudo. */
export async function iniciarSesionChef(correo: string, clave: string): Promise<string | null> {
  const { error } = await supabase().auth.signInWithPassword({
    email: correo.trim(),
    password: clave,
  });
  if (error) return "Correo o contraseña incorrectos.";
  if (!(await chefConSesion())) {
    await supabase().auth.signOut();
    return "Ese usuario no tiene permiso para administrar el restaurante.";
  }
  return null;
}

export async function cerrarSesionChef() {
  await supabase().auth.signOut();
}
