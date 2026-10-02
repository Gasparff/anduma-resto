import { describe, expect, it } from "vitest";
import { armarNotificacion, temaDelNegocio, validarAviso } from "@/lib/avisos-servidor";

const ID = "3f2b8c1e-5a47-4d3e-9b61-0c7d2a9e4f10";

const base = {
  slug: "resto-demo",
  id: ID,
  anfitrion: "  Valentina   Pérez ",
  telefono: "3573 44-3038",
  servicio: "Cumpleaños",
  fecha: "sábado, 10 de octubre",
  hora: "21:00",
  lugar: "Salón restó",
  cantidad: "40 personas",
  presupuesto: "$790.000",
  comentario: "Sin lactosa",
  whatsappCliente: "+54 9 3573 44-3038",
};

describe("validación de avisos", () => {
  it("limpia espacios y deja solo dígitos en el WhatsApp", () => {
    const a = validarAviso(base);
    expect(a.anfitrion).toBe("Valentina Pérez");
    expect(a.whatsappCliente).toBe("5493573443038");
  });

  it("recorta los textos largos", () => {
    const a = validarAviso({ ...base, comentario: "x".repeat(5000), anfitrion: "n".repeat(500) });
    expect(a.comentario).toHaveLength(300);
    expect(a.anfitrion).toHaveLength(80);
  });

  it("rechaza lo que no es un aviso válido", () => {
    expect(() => validarAviso(null)).toThrow();
    expect(() => validarAviso("hola")).toThrow();
    expect(() => validarAviso({ ...base, id: "no-es-un-uuid" })).toThrow(/Pedido inválido/);
    expect(() => validarAviso({ ...base, slug: "Mal Slug!" })).toThrow(/Negocio inválido/);
    expect(() => validarAviso({ ...base, slug: "" })).toThrow();
  });

  it("ignora campos que no son texto", () => {
    const a = validarAviso({ ...base, comentario: { x: 1 }, hora: 21 });
    expect(a.comentario).toBe("");
    expect(a.hora).toBe("");
  });
});

describe("tema de ntfy por negocio", () => {
  it("el negocio principal usa NTFY_TOPIC o, si no, el viejo VITE_NTFY_TOPIC", () => {
    expect(temaDelNegocio("resto-demo", { NTFY_TOPIC: " secreto " })).toBe("secreto");
    expect(temaDelNegocio("resto-demo", { VITE_NTFY_TOPIC: "viejo" })).toBe("viejo");
    expect(temaDelNegocio("resto-demo", { NTFY_TOPIC: "nuevo", VITE_NTFY_TOPIC: "viejo" })).toBe(
      "nuevo",
    );
  });

  it("sin variables no hay tema (no se envía nada)", () => {
    expect(temaDelNegocio("resto-demo", {})).toBeNull();
    expect(temaDelNegocio("resto-demo", { NTFY_TOPIC: "  " })).toBeNull();
  });

  it("otro restaurante solo avisa si tiene su propio tema (nunca al del principal)", () => {
    const env = { NTFY_TOPIC: "del-principal", NTFY_TOPICS: '{"la-parrilla":"de-la-parrilla"}' };
    expect(temaDelNegocio("la-parrilla", env)).toBe("de-la-parrilla");
    expect(temaDelNegocio("otro", env)).toBeNull();
    expect(temaDelNegocio("resto-demo", env)).toBe("del-principal");
  });

  it("tolera un NTFY_TOPICS mal escrito", () => {
    expect(temaDelNegocio("resto-demo", { NTFY_TOPIC: "t", NTFY_TOPICS: "{no es json" })).toBe("t");
    expect(temaDelNegocio("la-parrilla", { NTFY_TOPICS: "{no es json" })).toBeNull();
  });
});

describe("notificación", () => {
  const n = armarNotificacion(validarAviso(base), "tema-x", "https://anduma-resto.vercel.app");

  it("lleva el tema, un título claro y los datos del pedido", () => {
    expect(n.topic).toBe("tema-x");
    expect(n.title).toBe("🍽️ Pedido nuevo: Cumpleaños");
    expect(n.message).toContain("Valentina Pérez · 3573 44-3038");
    expect(n.message).toContain("sábado, 10 de octubre · 21:00 · Salón restó");
    expect(n.message).toContain("40 personas · $790.000");
    expect(n.message).toContain("“Sin lactosa”");
  });

  it("tiene ícono, enlace al panel y botones", () => {
    expect(n.icon).toBe("https://anduma-resto.vercel.app/icono-aviso.png");
    expect(n.click).toBe("https://anduma-resto.vercel.app/");
    expect(n.actions).toEqual([
      {
        action: "view",
        label: "Abrir panel",
        url: "https://anduma-resto.vercel.app/",
        clear: true,
      },
      {
        action: "view",
        label: "WhatsApp al cliente",
        url: "https://wa.me/5493573443038",
        clear: true,
      },
    ]);
  });

  it("sin teléfono de WhatsApp ni comentario no agrega esos elementos", () => {
    const m = armarNotificacion(
      validarAviso({ ...base, whatsappCliente: "", comentario: "" }),
      "t",
      "https://x.com",
    );
    expect(m.actions).toHaveLength(1);
    expect(m.message).not.toContain("“");
  });
});
