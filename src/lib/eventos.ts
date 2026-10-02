/**
 * DEMO SIN BACKEND REAL.
 * Toda la información (eventos y solicitudes) se guarda en el localStorage del
 * navegador, así que el chef y el anfitrión ven los mismos datos solo si usan
 * el mismo dispositivo. El siguiente paso es migrar esto a una base de datos.
 */
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Datos del restaurante                                               */
/* ------------------------------------------------------------------ */

export const NEGOCIO = {
  nombre: "Anduma Resto",
  direccion: "Salta 877, Villa del Rosario, Córdoba",
  // CONFIRMAR con el chef: formato internacional para wa.me (54 9 + característica + número).
  whatsapp: "5493573468600",
  whatsappVisible: "3573 46-8600",
  instagram: [
    { usuario: "andumagastronomia", etiqueta: "Restaurante" },
    { usuario: "andumaeventos", etiqueta: "Eventos" },
  ],
  // Según la biografía de Instagram. CONFIRMAR horarios exactos.
  horarios: ["Viandas todos los días", "Almuerzos todos los días", "Cenas de miércoles a sábado"],
} as const;

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
  // Formato "característica + 15 + número" (ej. 03573 15 46-8600): saca el 15 del medio.
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

export type SalonId = "eventos" | "resto";

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

export const LISTA_SALONES: Salon[] = [SALONES.eventos, SALONES.resto];

export type ServicioId = "bautismos" | "cumpleanos" | "casamientos" | "viandas";

export type Servicio = {
  id: ServicioId;
  nombre: string;
  /** Para frases como "pedido de bautismo". */
  singular: string;
  resumen: string;
  descripcion: string;
  incluye: string[];
  precio: string;
  /** Los eventos ocupan un salón; las viandas se preparan y se retiran o entregan. */
  usaSalon: boolean;
  unidad: "personas" | "viandas";
  horaSugerida: string;
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
    precio: "A consultar",
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
    precio: "A consultar",
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
    precio: "A consultar",
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
    precio: "A consultar",
    usaSalon: false,
    unidad: "viandas",
    horaSugerida: "12:00",
  },
];

export function servicioPorId(id: ServicioId): Servicio {
  return SERVICIOS.find((s) => s.id === id) ?? (SERVICIOS[0] as Servicio);
}

/** Capacidad máxima según el servicio y el salón elegido. */
export function capacidadMaxima(servicio: ServicioId, salon: SalonId | undefined) {
  if (!servicioPorId(servicio).usaSalon) return MAX_VIANDAS;
  return SALONES[salon ?? "eventos"].capacidad;
}

/** El salón más chico en el que entra el grupo. */
export function salonSugerido(personas: number): SalonId {
  return personas > 0 && personas <= SALONES.resto.capacidad ? "resto" : "eventos";
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
  estado: EstadoSolicitud;
  creada: string;
};

export type Datos = { eventos: Evento[]; solicitudes: Solicitud[] };

const STORAGE_KEY = "anduma-eventos-v1";
const SYNC_EVENT = "anduma-eventos-sync";

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
        telefono: "3573 55-0123",
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
        telefono: "3573 55-0456",
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

export function useDatos() {
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
        return `El ${SALONES[solicitud.salon].nombre} ya tiene un evento ese día.`;
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
