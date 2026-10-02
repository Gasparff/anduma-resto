import { describe, expect, it } from "vitest";
import {
  estadoApp,
  eventoDesdeFila,
  horaCorta,
  mensajeDeError,
  solicitudDesdeFila,
  type FilaEvento,
  type FilaSolicitud,
} from "@/lib/backend";

describe("conversión de datos de la base", () => {
  it("recorta la hora de HH:MM:SS a HH:MM", () => {
    expect(horaCorta("21:30:00")).toBe("21:30");
    expect(horaCorta("09:05")).toBe("09:05");
  });

  it("muestra 'cancelada' como rechazada y deja el resto igual", () => {
    expect(estadoApp("cancelada")).toBe("rechazada");
    expect(estadoApp("pendiente")).toBe("pendiente");
    expect(estadoApp("confirmada")).toBe("confirmada");
  });

  it("convierte un evento con servicio y salón", () => {
    const fila: FilaEvento = {
      id: "e1",
      fecha: "2026-10-20",
      nombre: "Quince de Camila",
      personas: 110,
      hora: "21:30:00",
      anfitrion: "Camila",
      servicios: { codigo: "cumpleanos" },
      salones: { codigo: "eventos" },
    };
    expect(eventoDesdeFila(fila)).toEqual({
      id: "e1",
      fecha: "2026-10-20",
      nombre: "Quince de Camila",
      personas: 110,
      servicio: "cumpleanos",
      hora: "21:30",
      salon: "eventos",
      anfitrion: "Camila",
    });
  });

  it("convierte una solicitud de viandas (sin salón ni presupuesto)", () => {
    const fila: FilaSolicitud = {
      id: "s1",
      anfitrion: "Constructora",
      telefono: "3573443038",
      fecha: "2026-10-08",
      hora: "12:00:00",
      personas: 60,
      comentario: "",
      dietas: [],
      presupuesto: null,
      estado: "pendiente",
      creada_en: "2026-10-01T10:00:00Z",
      servicios: { codigo: "viandas" },
      salones: null,
    };
    const s = solicitudDesdeFila(fila);
    expect(s.servicio).toBe("viandas");
    expect(s.salon).toBeUndefined();
    expect(s.presupuesto).toBeUndefined();
    expect(s.hora).toBe("12:00");
    expect(s.creada).toBe("2026-10-01T10:00:00Z");
  });

  it("convierte el presupuesto numérico que llega como texto", () => {
    const s = solicitudDesdeFila({
      id: "s2",
      anfitrion: "Ana",
      telefono: "3573443038",
      fecha: "2026-10-09",
      hora: "21:00:00",
      personas: 40,
      comentario: "",
      dietas: ["Vegano"],
      presupuesto: "790000.00" as unknown as number,
      estado: "cancelada",
      creada_en: "2026-10-01T10:00:00Z",
      servicios: { codigo: "cumpleanos" },
      salones: { codigo: "resto" },
    });
    expect(s.presupuesto).toBe(790000);
    expect(s.estado).toBe("rechazada");
  });
});

describe("mensajes de error", () => {
  it("usa el mensaje de la base cuando existe", () => {
    expect(mensajeDeError({ message: "Ese salón ya está ocupado ese día" })).toBe(
      "Ese salón ya está ocupado ese día",
    );
  });

  it("traduce los cortes de red", () => {
    expect(mensajeDeError({ message: "TypeError: Failed to fetch" })).toBe(
      "No hay conexión. Probá de nuevo.",
    );
  });

  it("tiene un mensaje por defecto", () => {
    expect(mensajeDeError(null)).toMatch(/No pudimos completar/);
  });
});
