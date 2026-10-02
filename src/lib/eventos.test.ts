import { describe, expect, it } from "vitest";
import {
  MAX_VIANDAS,
  SALONES,
  aISO,
  capacidadMaxima,
  salonOcupado,
  salonSugerido,
  telefonoWhatsapp,
  urlWhatsapp,
  type Evento,
} from "./eventos";

describe("telefonoWhatsapp", () => {
  it("agrega 549 a un número de 10 dígitos", () => {
    expect(telefonoWhatsapp("3573 46-8600")).toBe("5493573468600");
  });
  it("saca el 0 inicial y el 15", () => {
    expect(telefonoWhatsapp("03573 15 46-8600")).toBe("5493573468600");
  });
  it("respeta un número que ya empieza con 54", () => {
    expect(telefonoWhatsapp("+54 9 3573 46-8600")).toBe("5493573468600");
  });
});

describe("urlWhatsapp", () => {
  it("codifica el texto", () => {
    expect(urlWhatsapp("hola mundo", "549")).toBe("https://wa.me/549?text=hola%20mundo");
  });
  it("sin texto devuelve solo el número", () => {
    expect(urlWhatsapp(undefined, "549")).toBe("https://wa.me/549");
  });
});

describe("capacidad y salones", () => {
  it("las viandas usan el máximo por pedido", () => {
    expect(capacidadMaxima("viandas", undefined)).toBe(MAX_VIANDAS);
  });
  it("los eventos usan la capacidad del salón", () => {
    expect(capacidadMaxima("casamientos", "resto")).toBe(SALONES.resto.capacidad);
    expect(capacidadMaxima("casamientos", "eventos")).toBe(SALONES.eventos.capacidad);
  });
  it("sugiere el salón más chico que alcanza", () => {
    expect(salonSugerido(SALONES.resto.capacidad)).toBe("resto");
    expect(salonSugerido(SALONES.resto.capacidad + 1)).toBe("eventos");
  });
});

describe("salonOcupado", () => {
  const eventos: Evento[] = [
    {
      id: "1",
      fecha: "2026-11-01",
      nombre: "x",
      personas: 10,
      servicio: "bautismos",
      hora: "12:00",
      salon: "resto",
    },
  ];
  it("detecta el mismo salón el mismo día", () => {
    expect(salonOcupado(eventos, "2026-11-01", "resto")).toBe(true);
  });
  it("permite el otro salón o otro día", () => {
    expect(salonOcupado(eventos, "2026-11-01", "eventos")).toBe(false);
    expect(salonOcupado(eventos, "2026-11-02", "resto")).toBe(false);
  });
});

describe("aISO", () => {
  it("formatea con ceros a la izquierda", () => {
    expect(aISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
