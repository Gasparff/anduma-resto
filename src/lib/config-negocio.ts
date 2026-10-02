/**
 * Convierte la respuesta de la función `obtener_negocio` (supabase/migrations/0004) en la
 * configuración que usa la app. Es pura (sin red ni pantalla) para poder probarla.
 */
import type { ConfigNegocio, Negocio, Servicio } from "@/lib/eventos";

/** La base guarda la hora como HH:MM:SS; la app la usa como HH:MM. */
export function horaCorta(hora: string) {
  return hora.slice(0, 5);
}

type FilaNegocio = {
  slug: string;
  nombre: string;
  direccion: string | null;
  whatsapp: string | null;
  whatsapp_visible: string | null;
  email_contacto: string | null;
  instagram: string[] | null;
  horarios: string[] | null;
  descripcion: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  foto_url: string | null;
  color_primario: string | null;
  color_acento: string | null;
};

type FilaSalon = {
  codigo: string;
  nombre: string;
  capacidad: number;
  descripcion: string | null;
  recargo: number | string;
};

type FilaServicio = {
  codigo: string;
  nombre: string;
  singular: string;
  resumen: string | null;
  descripcion: string | null;
  incluye: string[] | null;
  precio_unitario: number | string;
  unidad: "personas" | "viandas";
  usa_salon: boolean;
  hora_sugerida: string | null;
  max_por_pedido: number | null;
};

export type RespuestaNegocio = {
  negocio: FilaNegocio;
  salones: FilaSalon[] | null;
  servicios: FilaServicio[] | null;
};

/** Un texto vacío en la base se trata como "sin valor". */
const texto = (v: string | null | undefined) => (v && v.trim() ? v.trim() : undefined);

export function configDesdeRespuesta(r: RespuestaNegocio): ConfigNegocio {
  const n = r.negocio;
  // Del más grande al más chico: es el orden en que se muestran y el primero es el que se elige al empezar.
  const salones = (r.salones ?? [])
    .map((s) => ({
      id: s.codigo,
      nombre: s.nombre,
      capacidad: s.capacidad,
      descripcion: s.descripcion ?? "",
      recargo: Number(s.recargo),
    }))
    .sort((a, b) => b.capacidad - a.capacidad);
  const hayCriterioDeSalon = salones.length > 0;

  const servicios: Servicio[] = (r.servicios ?? []).map((v) => ({
    id: v.codigo,
    nombre: v.nombre,
    singular: v.singular,
    resumen: v.resumen ?? "",
    descripcion: v.descripcion ?? "",
    incluye: v.incluye ?? [],
    precioUnitario: Number(v.precio_unitario),
    // Un servicio que pide salón no tiene sentido si el negocio no cargó ninguno.
    usaSalon: v.usa_salon && hayCriterioDeSalon,
    unidad: v.unidad,
    horaSugerida: horaCorta(v.hora_sugerida ?? "12:00:00"),
    ...(v.max_por_pedido ? { maxPorPedido: v.max_por_pedido } : {}),
  }));

  const opcionales: Partial<Negocio> = {
    ...(texto(n.descripcion) ? { descripcion: texto(n.descripcion)! } : {}),
    ...(texto(n.logo_url) ? { logoUrl: texto(n.logo_url)! } : {}),
    ...(texto(n.favicon_url) ? { faviconUrl: texto(n.favicon_url)! } : {}),
    ...(texto(n.foto_url) ? { fotoUrl: texto(n.foto_url)! } : {}),
    ...(texto(n.color_primario) ? { colorPrimario: texto(n.color_primario)! } : {}),
    ...(texto(n.color_acento) ? { colorAcento: texto(n.color_acento)! } : {}),
  };

  return {
    negocio: {
      nombre: n.nombre,
      direccion: n.direccion ?? "",
      whatsapp: n.whatsapp ?? "",
      whatsappVisible: n.whatsapp_visible ?? n.whatsapp ?? "",
      email: n.email_contacto ?? "",
      instagram: (n.instagram ?? []).map((usuario) => ({ usuario })),
      horarios: n.horarios ?? [],
      ...opcionales,
    },
    salones,
    servicios,
  };
}
