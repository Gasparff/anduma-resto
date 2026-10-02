/**
 * Marca de cada negocio: colores, favicon y título. Se aplica una vez al arrancar, con los datos
 * del negocio que corresponde a la dirección web, para que cada restaurante vea la app como propia.
 */
import type { Negocio } from "@/lib/eventos";

type Rgb = [number, number, number];

function aRgb(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: Rgb) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Mezcla un color con blanco (cantidad entre 0 y 1). */
export function aclarar(rgb: Rgb, cantidad: number): Rgb {
  return rgb.map((v) => v + (255 - v) * cantidad) as Rgb;
}

function luminancia([r, g, b]: Rgb) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const CLARO = "#fbf1dd";
const OSCURO = "#2a1b14";

/** El texto (claro u oscuro) que mejor se lee sobre un color de fondo. */
export function textoSobre(fondo: Rgb): string {
  const lf = luminancia(fondo);
  const contraste = (otro: Rgb) => {
    const lo = luminancia(otro);
    return (Math.max(lf, lo) + 0.05) / (Math.min(lf, lo) + 0.05);
  };
  return contraste(aRgb(CLARO)!) >= contraste(aRgb(OSCURO)!) ? CLARO : OSCURO;
}

/** Colores del negocio como variables CSS (las reglas están en styles.css, bajo [data-marca-*]). */
export function aplicarColores(n: Pick<Negocio, "colorPrimario" | "colorAcento">) {
  const raiz = document.documentElement;
  for (const k of [
    "--marca-primario",
    "--marca-primario-oscuro",
    "--marca-fg",
    "--marca-fg-oscuro",
    "--marca-acento",
  ]) {
    raiz.style.removeProperty(k);
  }
  delete raiz.dataset["marcaPrimario"];
  delete raiz.dataset["marcaAcento"];

  const primario = n.colorPrimario ? aRgb(n.colorPrimario) : null;
  if (primario) {
    // En modo oscuro el color se aclara un poco para que siga destacando sobre el fondo.
    const oscuro = aclarar(primario, 0.22);
    raiz.style.setProperty("--marca-primario", aHex(primario));
    raiz.style.setProperty("--marca-primario-oscuro", aHex(oscuro));
    raiz.style.setProperty("--marca-fg", textoSobre(primario));
    raiz.style.setProperty("--marca-fg-oscuro", textoSobre(oscuro));
    raiz.dataset["marcaPrimario"] = "1";
  }
  const acento = n.colorAcento ? aRgb(n.colorAcento) : null;
  if (acento) {
    raiz.style.setProperty("--marca-acento", aHex(acento));
    raiz.dataset["marcaAcento"] = "1";
  }
}

function poner(selector: string, atributo: string, valor: string | undefined) {
  if (!valor) return;
  document.querySelector(selector)?.setAttribute(atributo, valor);
}

/** Título de la pestaña, descripción e ícono del negocio. */
export function aplicarCabecera(n: Negocio) {
  document.title = `${n.nombre} — Eventos y viandas`;
  poner('meta[name="description"]', "content", n.descripcion);
  poner('meta[property="og:title"]', "content", `${n.nombre} — Eventos y viandas`);
  poner('meta[property="og:description"]', "content", n.descripcion);
  const icono = n.faviconUrl ?? n.logoUrl;
  if (icono) {
    for (const rel of ["icon", "apple-touch-icon"]) {
      const enlace = document.querySelector(`link[rel="${rel}"]`);
      enlace?.setAttribute("href", icono);
      // El tipo del ícono anterior puede no valer para el nuevo: que el navegador lo detecte.
      enlace?.removeAttribute("type");
    }
  }
}

export function aplicarMarca(n: Negocio) {
  aplicarColores(n);
  aplicarCabecera(n);
}
