import { describe, expect, it } from "vitest";
import {
  MAX_VIANDAS,
  SALONES,
  aISO,
  calcularPresupuesto,
  formatearPesos,
  RECARGO_SALON,
  SERVICIOS,
  capacidadMaxima,
  salonOcupado,
  salonSugerido,
  telefonoWhatsapp,
  urlWhatsapp,
  type Evento,
} from "./eventos";

describe("telefonoWhatsapp", () => {
  it("agrega 549 a un número de 10 dígitos", () => {
    expect(telefonoWhatsapp("3573 44-3038")).toBe("5493573443038");
  });
  it("saca el 0 inicial y el 15", () => {
    expect(telefonoWhatsapp("03573 15 44-3038")).toBe("5493573443038");
  });
  it("respeta un número que ya empieza con 54", () => {
    expect(telefonoWhatsapp("+54 9 3573 44-3038")).toBe("5493573443038");
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

describe("calcularPresupuesto", () => {
  const cumple = SERVICIOS.find((x) => x.id === "cumpleanos")!;
  it("suma precio por persona y recargo del salón", () => {
    const p = calcularPresupuesto("cumpleanos", "eventos", 10)!;
    expect(p.subtotal).toBe(cumple.precioUnitario * 10);
    expect(p.recargoSalon).toBe(RECARGO_SALON.eventos);
    expect(p.total).toBe(p.subtotal + p.recargoSalon);
  });
  it("las viandas no pagan recargo de salón", () => {
    expect(calcularPresupuesto("viandas", "eventos", 20)!.recargoSalon).toBe(0);
  });
  it("sin cantidad válida no hay presupuesto", () => {
    expect(calcularPresupuesto("cumpleanos", "resto", 0)).toBeNull();
    expect(calcularPresupuesto("cumpleanos", "resto", NaN)).toBeNull();
  });
  it("formatea pesos con separador de miles", () => {
    expect(formatearPesos(1234567)).toMatch(/^\$1[.,]234[.,]567$/);
  });
});
