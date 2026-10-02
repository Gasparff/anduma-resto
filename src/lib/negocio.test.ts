import { afterEach, describe, expect, it } from "vitest";
import { configDesdeRespuesta, type RespuestaNegocio } from "@/lib/config-negocio";
import { cabeceraDe } from "@/lib/cabecera";
import {
  LISTA_SALONES,
  NEGOCIO,
  SERVICIOS,
  aplicarConfigNegocio,
  calcularPresupuesto,
  capacidadMaxima,
  salonInicial,
  salonPorId,
  salonSugerido,
  servicioInicial,
  type ConfigNegocio,
} from "@/lib/eventos";
import { aclarar, textoSobre } from "@/lib/marca";

const parrilla: RespuestaNegocio = {
  negocio: {
    slug: "la-parrilla",
    nombre: "La Parrilla de Juan",
    direccion: "Av. Siempreviva 742, Rosario",
    whatsapp: "5493415551234",
    whatsapp_visible: "341 555-1234",
    email_contacto: "hola@laparrilla.com",
    instagram: ["laparrilladejuan"],
    horarios: ["Cenas de jueves a domingo"],
    descripcion: "Asados para tus reuniones.",
    logo_url: "",
    favicon_url: null,
    foto_url: null,
    color_primario: "#1f4e79",
    color_acento: null,
  },
  salones: [
    { codigo: "patio", nombre: "Patio", capacidad: 40, descripcion: null, recargo: "5000.00" },
    {
      codigo: "quincho",
      nombre: "Quincho",
      capacidad: 120,
      descripcion: "Techado",
      recargo: 20000,
    },
  ],
  servicios: [
    {
      codigo: "asados",
      nombre: "Asados",
      singular: "Asado",
      resumen: "Parrilla libre",
      descripcion: null,
      incluye: ["Parrillero"],
      precio_unitario: "12000.00",
      unidad: "personas",
      usa_salon: true,
      hora_sugerida: "20:30:00",
      max_por_pedido: null,
    },
    {
      codigo: "catering",
      nombre: "Catering",
      singular: "Catering",
      resumen: null,
      descripcion: null,
      incluye: null,
      precio_unitario: 9000,
      unidad: "viandas",
      usa_salon: false,
      hora_sugerida: null,
      max_por_pedido: 80,
    },
  ],
};

describe("configuración de un negocio desde la base", () => {
  const c = configDesdeRespuesta(parrilla);

  it("convierte los datos de presentación y trata los textos vacíos como ausentes", () => {
    expect(c.negocio.nombre).toBe("La Parrilla de Juan");
    expect(c.negocio.whatsappVisible).toBe("341 555-1234");
    expect(c.negocio.instagram).toEqual([{ usuario: "laparrilladejuan" }]);
    expect(c.negocio.logoUrl).toBeUndefined(); // "" en la base = sin logo
    expect(c.negocio.fotoUrl).toBeUndefined();
    expect(c.negocio.colorPrimario).toBe("#1f4e79");
    expect(c.negocio.colorAcento).toBeUndefined();
  });

  it("convierte salones y servicios (números que llegan como texto, horas, topes)", () => {
    // Quedan ordenados del más grande al más chico, sin depender del orden en que lleguen.
    expect(c.salones.map((s) => [s.id, s.recargo])).toEqual([
      ["quincho", 20000],
      ["patio", 5000],
    ]);
    const asados = c.servicios.find((s) => s.id === "asados")!;
    expect(asados.precioUnitario).toBe(12000);
    expect(asados.horaSugerida).toBe("20:30");
    const catering = c.servicios.find((s) => s.id === "catering")!;
    expect(catering.maxPorPedido).toBe(80);
    expect(catering.horaSugerida).toBe("12:00");
    expect(catering.incluye).toEqual([]);
  });

  it("un servicio que pide salón no lo usa si el negocio no cargó ninguno", () => {
    const sinSalones = configDesdeRespuesta({ ...parrilla, salones: [] });
    expect(sinSalones.servicios.find((s) => s.id === "asados")!.usaSalon).toBe(false);
  });

  it("tolera listas ausentes", () => {
    const vacio = configDesdeRespuesta({ ...parrilla, salones: null, servicios: null });
    expect(vacio.salones).toEqual([]);
    expect(vacio.servicios).toEqual([]);
  });
});

describe("aplicar la configuración de otro negocio", () => {
  const original: ConfigNegocio = {
    negocio: structuredClone(NEGOCIO),
    salones: LISTA_SALONES.map((s) => ({ ...s, recargo: 0 })),
    servicios: structuredClone(SERVICIOS),
  };

  afterEach(() => aplicarConfigNegocio(original));

  it("reemplaza el negocio, los salones y los servicios sin dejar rastros del anterior", () => {
    aplicarConfigNegocio(configDesdeRespuesta(parrilla));
    expect(NEGOCIO.nombre).toBe("La Parrilla de Juan");
    expect(NEGOCIO.logoUrl).toBeUndefined();
    expect(NEGOCIO.fotoUrl).toBeUndefined();
    expect(LISTA_SALONES.map((s) => s.id)).toEqual(["quincho", "patio"]);
    expect(SERVICIOS.map((s) => s.id)).toEqual(["asados", "catering"]);
    expect(salonPorId("eventos").id).not.toBe("eventos"); // el salón de otro negocio no existe acá
  });

  it("el presupuesto y los topes usan los precios y salones del negocio activo", () => {
    aplicarConfigNegocio(configDesdeRespuesta(parrilla));
    const p = calcularPresupuesto("asados", "quincho", 10)!;
    expect(p.subtotal).toBe(120000);
    expect(p.recargoSalon).toBe(20000);
    expect(capacidadMaxima("asados", "patio")).toBe(40);
    expect(capacidadMaxima("catering", undefined)).toBe(80);
  });

  it("sugiere el salón más chico en el que entra el grupo, para cualquier catálogo", () => {
    aplicarConfigNegocio(configDesdeRespuesta(parrilla));
    expect(salonSugerido(30)).toBe("patio");
    expect(salonSugerido(41)).toBe("quincho");
    expect(salonSugerido(500)).toBe("quincho"); // no entra en ninguno: el más grande
  });

  it("elige un servicio y un salón iniciales válidos", () => {
    aplicarConfigNegocio(configDesdeRespuesta(parrilla));
    expect(servicioInicial()).toBe("asados");
    expect(salonInicial()).toBe("quincho"); // el más grande
  });
});

describe("colores de la marca", () => {
  it("elige texto claro sobre fondos oscuros y oscuro sobre fondos claros", () => {
    expect(textoSobre([31, 78, 121])).toBe("#fbf1dd"); // azul oscuro
    expect(textoSobre([245, 197, 24])).toBe("#2a1b14"); // amarillo
    expect(textoSobre([255, 255, 255])).toBe("#2a1b14");
  });

  it("aclarar mezcla con blanco", () => {
    expect(aclarar([0, 0, 0], 0.5).map(Math.round)).toEqual([128, 128, 128]);
    expect(aclarar([100, 100, 100], 0)).toEqual([100, 100, 100]);
  });
});

describe("encabezado de la página", () => {
  it("es neutro cuando no se pudo determinar el negocio", () => {
    const c = cabeceraDe(null);
    expect(c.meta).toEqual([{ title: "Reservas" }]);
    expect(c.links).toEqual([]);
  });

  it("usa los datos del negocio y solo agrega lo que tiene", () => {
    const c = cabeceraDe({
      nombre: "La Parrilla de Juan",
      descripcion: null,
      icono: null,
      imagen: null,
    });
    expect(c.meta[0]).toEqual({ title: "La Parrilla de Juan — Eventos y viandas" });
    expect(JSON.stringify(c)).not.toMatch(/og:image|description/);
    expect(c.links).toEqual([]);
  });

  it("incluye ícono e imagen cuando existen", () => {
    const c = cabeceraDe({
      nombre: "X",
      descripcion: "Texto",
      icono: "https://x.com/i.png",
      imagen: "https://x.com/l.png",
    });
    expect(c.links).toEqual([
      { rel: "icon", href: "https://x.com/i.png" },
      { rel: "apple-touch-icon", href: "https://x.com/i.png" },
    ]);
    expect(JSON.stringify(c.meta)).toMatch(/og:image/);
  });
});
