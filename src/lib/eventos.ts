/**
 * Datos de la app: eventos y solicitudes.
 *
 * Si la base de Supabase está lista (ver supabase/ y docs/BACKEND.md), los datos viven ahí y
 * los ven todos los dispositivos. Si todavía no, la app funciona en MODO DEMOSTRACIÓN: guarda
 * todo en el localStorage del navegador y chef y anfitrión solo comparten datos si usan el
 * mismo dispositivo. `useDatos` elige solo entre los dos modos.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  agregarEventoRemoto,
  cargarOcupadas,
  cargarPanelChef,
  crearSolicitudRemota,
  eliminarEventoRemoto,
  escucharCambios,
  expirarPedidosVencidos,
  estadoDePedidos,
  responderSolicitudRemota,
} from "@/lib/backend";
import { useModoBackend, type ModoBackend } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Datos del restaurante                                               */
/* ------------------------------------------------------------------ */

export type Negocio = {
  nombre: string;
  direccion: string;
  /** Formato internacional para wa.me (54 9 + característica + número). */
  whatsapp: string;
  whatsappVisible: string;
  email: string;
  instagram: { usuario: string; etiqueta?: string }[];
  horarios: string[];
  descripcion?: string;
  logoUrl?: string;
  faviconUrl?: string;
  /** Foto de fondo de la pantalla de ingreso. */
  fotoUrl?: string;
  colorPrimario?: string;
  colorAcento?: string;
};

/**
 * Datos del restaurante. Estos valores son los de la demostración y sirven de respaldo; cuando la
 * base está conectada, `aplicarConfigNegocio` los reemplaza por los del negocio que corresponde
 * a la dirección web.
 */
export const NEGOCIO: Negocio = {
  nombre: "Resto Demo",
  direccion: "Calle Falsa 123, Ciudad Demo, Córdoba",
  // DATOS DE PRUEBA (ficticios, salvo teléfono y mail, que son de Gaspar). Reemplazar por los reales del cliente.
  whatsapp: "5493573443038",
  whatsappVisible: "3573 44-3038",
  email: "fernandezgaspar13@gmail.com",
  instagram: [
    { usuario: "restodemo", etiqueta: "Restaurante" },
    { usuario: "restodemo.eventos", etiqueta: "Eventos" },
  ],
  // Horarios ficticios de demostración.
  horarios: ["Viandas todos los días", "Almuerzos todos los días", "Cenas de miércoles a sábado"],
  descripcion: "Bautismos, cumpleaños, casamientos y viandas en Ciudad Demo.",
  logoUrl: "/logo.svg",
  fotoUrl: "/login-fondo.jpg",
};

export function urlWhatsapp(texto?: string, numero: string = NEGOCIO.whatsapp) {
  const base = `https://wa.me/${numero}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** Deja solo dígitos para comparar teléfonos sin importar espacios o guiones. */
export function soloDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** Convierte un teléfono argentino escrito a mano al formato que pide wa.me. */
export function telefonoWhatsapp(valor: string) {
  let d = soloDigitos(valor).replace(/^0+/, "");
  if (d.startsWith("54")) return d;
  if (d.startsWith("15")) d = d.slice(2);
  // Formato "característica + 15 + número" (ej. 03573 15 44-3038): saca el 15 del medio.
  if (d.length === 12) {
    for (const k of [2, 3, 4]) {
      if (d.slice(k, k + 2) === "15") {
        d = d.slice(0, k) + d.slice(k + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : d;
}

/* ------------------------------------------------------------------ */
/* Salones y servicios                                                 */
/* ------------------------------------------------------------------ */

export type SalonId = string;

export type Salon = {
  id: SalonId;
  nombre: string;
  capacidad: number;
  descripcion: string;
};

export const SALONES: Record<SalonId, Salon> = {
  eventos: {
    id: "eventos",
    nombre: "Salón de eventos",
    capacidad: 160,
    descripcion: "El salón grande, pensado para fiestas y celebraciones.",
  },
  resto: {
    id: "resto",
    nombre: "Salón restó",
    // CONFIRMAR con el chef: 60 u 80 personas.
    capacidad: 60,
    descripcion: "El salón del restaurante, más recogido y familiar.",
  },
};

export const LISTA_SALONES: Salon[] = Object.values(SALONES);

export type ServicioId = string;

export type Servicio = {
  id: ServicioId;
  nombre: string;
  /** Para frases como "pedido de bautismo". */
  singular: string;
  resumen: string;
  descripcion: string;
  incluye: string[];
  /** Precio por persona (o por vianda) en pesos. Valores ficticios de demostración. */
  precioUnitario: number;
  /** Los eventos ocupan un salón; las viandas se preparan y se retiran o entregan. */
  usaSalon: boolean;
  unidad: "personas" | "viandas";
  horaSugerida: string;
  /** Tope por pedido cuando el servicio no usa salón (viandas). */
  maxPorPedido?: number;
};

/** Cantidad máxima de viandas por pedido. CONFIRMAR con el chef. */
export const MAX_VIANDAS = 300;

export const SERVICIOS: Servicio[] = [
  {
    id: "bautismos",
    nombre: "Bautismos",
    singular: "Bautismo",
    resumen: "Un almuerzo en familia, sin vueltas",
    descripcion: "Cocina casera y cuidada para recibir a los invitados después de la ceremonia.",
    incluye: [
      "Menú a pedido, armado con vos",
      "Salón a elección",
      "Atención de mesa",
      "Opciones para celíacos y vegetarianos",
    ],
    precioUnitario: 18000,
    usaSalon: true,
    unidad: "personas",
    horaSugerida: "12:30",
  },
  {
    id: "cumpleanos",
    nombre: "Cumpleaños",
    singular: "Cumpleaños",
    resumen: "De los 3 a los 90, con la mesa llena",
    descripcion: "Infantiles, de quince o reuniones de amigos. Comida abundante y clima de fiesta.",
    incluye: [
      "Menú a pedido",
      "Salón a elección",
      "Atención de mesa",
      "Espacio para torta y música",
    ],
    precioUnitario: 16000,
    usaSalon: true,
    unidad: "personas",
    horaSugerida: "21:00",
  },
  {
    id: "casamientos",
    nombre: "Casamientos",
    singular: "Casamiento",
    resumen: "El menú de tu fiesta, de punta a punta",
    descripcion:
      "Recepción, cena y barra para el día más importante. Coordinamos los tiempos con vos.",
    incluye: [
      "Menú de varios pasos a pedido",
      "Salón de eventos o salón restó",
      "Personal de cocina y de sala",
      "Reunión previa para definir el menú",
    ],
    precioUnitario: 32000,
    usaSalon: true,
    unidad: "personas",
    horaSugerida: "21:00",
  },
  {
    id: "viandas",
    nombre: "Viandas",
    singular: "Viandas",
    resumen: "Para empresas, obras y grupos",
    descripcion:
      "Viandas por encargo para equipos de trabajo, jornadas o reuniones. Se retiran o se entregan.",
    incluye: [
      "Menú del día o a pedido",
      "Envasado individual",
      "Retiro en el local o entrega",
      "Pedidos fijos por semana",
    ],
    precioUnitario: 6500,
    usaSalon: false,
    unidad: "viandas",
    horaSugerida: "12:00",
  },
];

/** Recargo fijo por usar cada salón (ficticio). */
const SALON_VACIO: Salon = { id: "", nombre: "", capacidad: 0, descripcion: "" };

/** Salón por id. Si no existe (por ejemplo, de otro negocio) devuelve el primero, nunca undefined. */
export function salonPorId(id: SalonId | undefined): Salon {
  return (id === undefined ? undefined : SALONES[id]) ?? LISTA_SALONES[0] ?? SALON_VACIO;
}

export const RECARGO_SALON: Record<SalonId, number> = { eventos: 150000, resto: 0 };

/* ------------------------------------------------------------------ */
/* Configuración por negocio                                           */
/* ------------------------------------------------------------------ */

export type ConfigNegocio = {
  negocio: Negocio;
  salones: (Salon & { recargo: number })[];
  servicios: Servicio[];
};

/**
 * Reemplaza los datos del restaurante, los salones y los servicios por los de otro negocio.
 * Se hace sobre los mismos objetos exportados (no se reasignan) para que todo el código que ya los
 * importa vea los datos nuevos. Cada página corresponde a un solo negocio, así que se llama una vez
 * al arrancar, antes de mostrar nada.
 */
export function aplicarConfigNegocio(c: ConfigNegocio) {
  for (const k of Object.keys(NEGOCIO)) delete (NEGOCIO as Record<string, unknown>)[k];
  Object.assign(NEGOCIO, c.negocio);

  for (const k of Object.keys(SALONES)) delete SALONES[k];
  for (const k of Object.keys(RECARGO_SALON)) delete RECARGO_SALON[k];
  for (const { recargo, ...salon } of c.salones) {
    SALONES[salon.id] = salon;
    RECARGO_SALON[salon.id] = recargo;
  }
  LISTA_SALONES.splice(0, LISTA_SALONES.length, ...Object.values(SALONES));

  SERVICIOS.splice(0, SERVICIOS.length, ...c.servicios);
}

export function formatearPesos(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}

export function textoPrecio(servicio: Servicio) {
  const por = servicio.unidad === "viandas" ? "vianda" : "persona";
  return `Desde ${formatearPesos(servicio.precioUnitario)} por ${por}`;
}

export type Presupuesto = {
  unitario: number;
  subtotal: number;
  recargoSalon: number;
  total: number;
};

/** Presupuesto estimado, sin cargar a nadie: la cifra final la confirma el chef. */
export function calcularPresupuesto(
  servicio: ServicioId,
  salon: SalonId | undefined,
  cantidad: number,
): Presupuesto | null {
  if (!Number.isFinite(cantidad) || cantidad < 1) return null;
  const info = servicioPorId(servicio);
  const subtotal = info.precioUnitario * cantidad;
  const recargoSalon = info.usaSalon && salon ? (RECARGO_SALON[salon] ?? 0) : 0;
  return { unitario: info.precioUnitario, subtotal, recargoSalon, total: subtotal + recargoSalon };
}

export function servicioPorId(id: ServicioId): Servicio {
  return SERVICIOS.find((s) => s.id === id) ?? (SERVICIOS[0] as Servicio);
}

/** Capacidad máxima según el servicio y el salón elegido. */
export function capacidadMaxima(servicio: ServicioId, salon: SalonId | undefined) {
  const info = servicioPorId(servicio);
  if (!info.usaSalon) return info.maxPorPedido ?? MAX_VIANDAS;
  return (SALONES[salon ?? ""] ?? LISTA_SALONES[0])?.capacidad ?? 0;
}

/** El salón más chico en el que entra el grupo. */
export function salonSugerido(personas: number): SalonId {
  const porTamano = [...LISTA_SALONES].sort((a, b) => a.capacidad - b.capacidad);
  const chico = porTamano.find((x) => personas > 0 && personas <= x.capacidad);
  return (chico ?? porTamano[porTamano.length - 1])?.id ?? "";
}

/** Servicio que se muestra elegido al empezar: el primero que usa salón (o el primero a secas). */
export function servicioInicial(): ServicioId {
  return (SERVICIOS.find((x) => x.usaSalon) ?? SERVICIOS[0])?.id ?? "";
}

/** Salón que se muestra elegido al empezar: el más grande. */
export function salonInicial(): SalonId {
  return LISTA_SALONES[0]?.id ?? "";
}

/* ------------------------------------------------------------------ */
/* Modelo                                                              */
/* ------------------------------------------------------------------ */

export type Evento = {
  id: string;
  fecha: string; // YYYY-MM-DD
  nombre: string;
  personas: number;
  servicio: ServicioId;
  hora: string;
  salon?: SalonId | undefined;
  anfitrion?: string;
};

export type EstadoSolicitud = "pendiente" | "confirmada" | "rechazada";

export type Solicitud = {
  id: string;
  anfitrion: string;
  telefono: string;
  fecha: string;
  hora: string;
  servicio: ServicioId;
  salon?: SalonId | undefined;
  personas: number;
  comentario: string;
  dietas?: string[];
  /** Presupuesto estimado en pesos al momento del pedido. */
  presupuesto?: number | undefined;
  estado: EstadoSolicitud;
  creada: string;
};

export type Datos = { eventos: Evento[]; solicitudes: Solicitud[] };

const STORAGE_KEY = "demo-eventos-v2";
const SYNC_EVENT = "demo-eventos-sync";

export function aISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function hoyISO() {
  return aISO(new Date());
}

export function formatearFecha(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** ¿Ese salón ya tiene un evento ese día? */
export function salonOcupado(eventos: Evento[], fecha: string, salon: SalonId) {
  return eventos.some((e) => e.fecha === fecha && e.salon === salon);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Datos de ejemplo (ficticios) para poder mostrar la demo. */
function datosIniciales(): Datos {
  const base = new Date();
  const dia = (n: number) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
    return aISO(d);
  };
  return {
    eventos: [
      {
        id: uid(),
        fecha: dia(4),
        nombre: "Bautismo de Benjamín",
        personas: 45,
        servicio: "bautismos",
        hora: "12:30",
        salon: "resto",
        anfitrion: "Familia Ferreyra",
      },
      {
        id: uid(),
        fecha: dia(11),
        nombre: "Casamiento de Julieta y Nicolás",
        personas: 140,
        servicio: "casamientos",
        hora: "21:00",
        salon: "eventos",
        anfitrion: "Julieta",
      },
      {
        id: uid(),
        fecha: dia(11),
        nombre: "Cumpleaños de Don Raúl",
        personas: 30,
        servicio: "cumpleanos",
        hora: "21:30",
        salon: "resto",
        anfitrion: "Familia Aguirre",
      },
      {
        id: uid(),
        fecha: dia(19),
        nombre: "Quince de Camila",
        personas: 110,
        servicio: "cumpleanos",
        hora: "21:30",
        salon: "eventos",
        anfitrion: "Camila",
      },
    ],
    solicitudes: [
      {
        id: uid(),
        anfitrion: "Martín",
        telefono: "3573 44-3038",
        fecha: dia(8),
        hora: "21:00",
        servicio: "cumpleanos",
        salon: "resto",
        personas: 40,
        comentario: "Cumple de 40, con parrillada y postre helado.",
        dietas: ["Sin lactosa"],
        estado: "pendiente",
        creada: new Date().toISOString(),
      },
      {
        id: uid(),
        anfitrion: "Constructora del Sur",
        telefono: "3573 44-3038",
        fecha: dia(6),
        hora: "12:00",
        servicio: "viandas",
        personas: 60,
        comentario: "Viandas para el equipo de obra, de lunes a viernes.",
        estado: "pendiente",
        creada: new Date().toISOString(),
      },
    ],
  };
}

function leer(): Datos {
  if (typeof window === "undefined") return { eventos: [], solicitudes: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const iniciales = datosIniciales();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
      return iniciales;
    }
    const parsed = JSON.parse(raw) as Datos;
    return {
      eventos: Array.isArray(parsed.eventos) ? parsed.eventos : [],
      solicitudes: Array.isArray(parsed.solicitudes) ? parsed.solicitudes : [],
    };
  } catch {
    return datosIniciales();
  }
}

function guardar(datos: Datos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento (modo privado): la demo sigue funcionando en memoria.
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

function useDatosLocales() {
  const [datos, setDatos] = useState<Datos>({ eventos: [], solicitudes: [] });

  useEffect(() => {
    setDatos(leer());
    const refrescar = () => setDatos(leer());
    window.addEventListener(SYNC_EVENT, refrescar);
    window.addEventListener("storage", refrescar);
    return () => {
      window.removeEventListener(SYNC_EVENT, refrescar);
      window.removeEventListener("storage", refrescar);
    };
  }, []);

  const actualizar = useCallback((fn: (prev: Datos) => Datos) => {
    const siguiente = fn(leer());
    guardar(siguiente);
    setDatos(siguiente);
  }, []);

  const agregarEvento = useCallback(
    (evento: Omit<Evento, "id">) =>
      actualizar((prev) => ({ ...prev, eventos: [...prev.eventos, { ...evento, id: uid() }] })),
    [actualizar],
  );

  const eliminarEvento = useCallback(
    (id: string) =>
      actualizar((prev) => ({ ...prev, eventos: prev.eventos.filter((e) => e.id !== id) })),
    [actualizar],
  );

  const crearSolicitud = useCallback(
    (solicitud: Omit<Solicitud, "id" | "estado" | "creada">) =>
      actualizar((prev) => ({
        ...prev,
        solicitudes: [
          ...prev.solicitudes,
          { ...solicitud, id: uid(), estado: "pendiente", creada: new Date().toISOString() },
        ],
      })),
    [actualizar],
  );

  /** Devuelve un mensaje de error si no se pudo aceptar, o null si salió bien. */
  const responderSolicitud = useCallback(
    (id: string, estado: Exclude<EstadoSolicitud, "pendiente">): string | null => {
      const actual = leer();
      const solicitud = actual.solicitudes.find((s) => s.id === id);
      if (!solicitud) return "No encontramos esa solicitud.";

      const usaSalon = servicioPorId(solicitud.servicio).usaSalon;
      if (
        estado === "confirmada" &&
        usaSalon &&
        solicitud.salon &&
        salonOcupado(actual.eventos, solicitud.fecha, solicitud.salon)
      ) {
        return `El ${salonPorId(solicitud.salon).nombre} ya tiene un evento ese día.`;
      }

      const solicitudes = actual.solicitudes.map((s) => (s.id === id ? { ...s, estado } : s));
      if (estado === "rechazada") {
        const siguiente = { ...actual, solicitudes };
        guardar(siguiente);
        setDatos(siguiente);
        return null;
      }

      const servicio = servicioPorId(solicitud.servicio);
      const nuevoEvento: Evento = {
        id: uid(),
        fecha: solicitud.fecha,
        nombre: `${servicio.singular} de ${solicitud.anfitrion}`,
        personas: solicitud.personas,
        servicio: solicitud.servicio,
        hora: solicitud.hora,
        salon: solicitud.salon,
        anfitrion: solicitud.anfitrion,
      };
      const siguiente = { eventos: [...actual.eventos, nuevoEvento], solicitudes };
      guardar(siguiente);
      setDatos(siguiente);
      return null;
    },
    [],
  );

  /** Vuelve a cargar los datos de ejemplo. Útil antes de cada demostración. */
  const reiniciarDemo = useCallback(() => {
    const iniciales = datosIniciales();
    guardar(iniciales);
    setDatos(iniciales);
  }, []);

  return {
    datos,
    agregarEvento,
    eliminarEvento,
    crearSolicitud,
    responderSolicitud,
    reiniciarDemo,
  };
}

/* ------------------------------------------------------------------ */
/* Modo base de datos                                                  */
/* ------------------------------------------------------------------ */

const CLAVE_MIS_PEDIDOS = "anduma-mis-pedidos-v1";
const MAX_MIS_PEDIDOS = 50;

/** Los pedidos que hizo este dispositivo (el anfitrión no tiene cuenta, así que se recuerdan acá). */
function leerMisPedidos(): Solicitud[] {
  try {
    const raw = window.localStorage.getItem(CLAVE_MIS_PEDIDOS);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Solicitud[]) : [];
  } catch {
    return [];
  }
}

function guardarMisPedidos(pedidos: Solicitud[]) {
  try {
    window.localStorage.setItem(CLAVE_MIS_PEDIDOS, JSON.stringify(pedidos.slice(-MAX_MIS_PEDIDOS)));
  } catch {
    // Sin almacenamiento: el pedido igual quedó guardado en la base.
  }
}

const REFRESCO_MS = 15000;
const DATOS_VACIOS: Datos = { eventos: [], solicitudes: [] };

function useDatosRemotos(rol: Rol, activo: boolean) {
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);

  const refrescar = useCallback(async () => {
    if (!activo) return;
    try {
      if (rol === "chef") {
        setDatos(await cargarPanelChef());
        return;
      }
      const mios = leerMisPedidos();
      const [eventos, estados] = await Promise.all([
        cargarOcupadas(),
        estadoDePedidos(mios.map((m) => m.id)),
      ]);
      const solicitudes = mios.map((m) => ({ ...m, estado: estados.get(m.id) ?? m.estado }));
      guardarMisPedidos(solicitudes);
      setDatos({ eventos, solicitudes });
    } catch {
      // Sin conexión o sesión vencida: se mantienen los últimos datos mostrados.
    }
  }, [activo, rol]);

  // Carga inicial, refresco periódico y al volver a la pestaña.
  useEffect(() => {
    if (!activo) return;
    if (rol === "chef") void expirarPedidosVencidos().then(() => refrescar());
    else void refrescar();
    const timer = window.setInterval(() => void refrescar(), REFRESCO_MS);
    // El chef además se entera al instante cuando entra un pedido (si la base lo permite).
    const dejarDeEscuchar = rol === "chef" ? escucharCambios(() => void refrescar()) : () => {};
    const alVolver = () => {
      if (document.visibilityState === "visible") void refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(timer);
      dejarDeEscuchar();
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo, refrescar, rol]);

  const agregarEvento = useCallback(
    async (evento: Omit<Evento, "id">) => {
      const error = await agregarEventoRemoto(evento);
      await refrescar();
      return error;
    },
    [refrescar],
  );

  const eliminarEvento = useCallback(
    async (id: string) => {
      const error = await eliminarEventoRemoto(id);
      await refrescar();
      return error;
    },
    [refrescar],
  );

  const crearSolicitud = useCallback(
    async (solicitud: Omit<Solicitud, "id" | "estado" | "creada">) => {
      const res = await crearSolicitudRemota(solicitud);
      if ("error" in res) return { error: res.error };
      guardarMisPedidos([
        ...leerMisPedidos(),
        { ...solicitud, id: res.id, estado: "pendiente", creada: new Date().toISOString() },
      ]);
      await refrescar();
      return { id: res.id };
    },
    [refrescar],
  );

  const responderSolicitud = useCallback(
    async (id: string, estado: Exclude<EstadoSolicitud, "pendiente">) => {
      const error = await responderSolicitudRemota(id, estado);
      await refrescar();
      return error;
    },
    [refrescar],
  );

  return { datos, agregarEvento, eliminarEvento, crearSolicitud, responderSolicitud };
}

/* ------------------------------------------------------------------ */
/* Hook que usan las pantallas                                         */
/* ------------------------------------------------------------------ */

export type Rol = "chef" | "anfitrion";

export type ResultadoPedido = { error: string } | { id: string | null };

/** Las acciones devuelven un mensaje de error, o null si salió bien (salvo crearSolicitud). */
export type AccionesDatos = {
  agregarEvento: (evento: Omit<Evento, "id">) => Promise<string | null>;
  eliminarEvento: (id: string) => Promise<string | null>;
  /** Devuelve el id del pedido creado (null en modo demostración) o un mensaje de error. */
  crearSolicitud: (s: Omit<Solicitud, "id" | "estado" | "creada">) => Promise<ResultadoPedido>;
  responderSolicitud: (
    id: string,
    estado: Exclude<EstadoSolicitud, "pendiente">,
  ) => Promise<string | null>;
  /** Solo existe en modo demostración. */
  reiniciarDemo: () => void;
};

export function useDatos(
  rol: Rol = "anfitrion",
): AccionesDatos & { datos: Datos; modo: ModoBackend } {
  const modo = useModoBackend();
  const local = useDatosLocales();
  const remoto = useDatosRemotos(rol, modo === "remoto");
  // La referencia evita que las acciones cambien de identidad en cada render.
  const localRef = useRef(local);
  localRef.current = local;

  if (modo === "remoto") {
    return { modo, ...remoto, reiniciarDemo: () => {} };
  }

  if (modo === "cargando") {
    const mensaje = "Un momento, estamos conectando.";
    const pendiente = async () => mensaje;
    return {
      modo,
      datos: DATOS_VACIOS,
      agregarEvento: pendiente,
      eliminarEvento: pendiente,
      crearSolicitud: async () => ({ error: mensaje }),
      responderSolicitud: pendiente,
      reiniciarDemo: () => {},
    };
  }

  return {
    modo,
    datos: local.datos,
    agregarEvento: async (e) => {
      localRef.current.agregarEvento(e);
      return null;
    },
    eliminarEvento: async (id) => {
      localRef.current.eliminarEvento(id);
      return null;
    },
    crearSolicitud: async (s) => {
      localRef.current.crearSolicitud(s);
      return { id: null };
    },
    responderSolicitud: async (id, estado) => localRef.current.responderSolicitud(id, estado),
    reiniciarDemo: () => localRef.current.reiniciarDemo(),
  };
}
