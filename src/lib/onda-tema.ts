/**
 * Cambio de modo claro/oscuro con una "onda expansiva": el color nuevo se expande en círculo desde
 * el botón hasta cubrir toda la pantalla, con un anillo de luz que se desvanece. Usa la API de
 * transiciones de vista del navegador; donde no existe (navegadores viejos) el cambio es un fundido
 * suave de colores.
 */

const DURACION_MS = 950;
const CURVA = "cubic-bezier(0.22, 0.61, 0.36, 1)";

type DocumentoConTransiciones = Document & {
  startViewTransition?: (alActualizar: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

/** Anillo de luz que se expande desde el botón y se desvanece. */
function lanzarAnillo(x: number, y: number, radio: number, oscuroAlTerminar: boolean) {
  const anillo = document.createElement("div");
  anillo.setAttribute("aria-hidden", "true");
  const color = oscuroAlTerminar ? "255 236 200" : "122 59 33";
  Object.assign(anillo.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: `${radio * 2}px`,
    height: `${radio * 2}px`,
    marginLeft: `${-radio}px`,
    marginTop: `${-radio}px`,
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: "2147483647",
    border: `2px solid rgb(${color} / 0.55)`,
    boxShadow: `0 0 40px 6px rgb(${color} / 0.35), inset 0 0 40px 6px rgb(${color} / 0.25)`,
    transformOrigin: "center",
    willChange: "transform, opacity",
  });
  document.body.appendChild(anillo);
  const animacion = anillo.animate(
    [
      { transform: "scale(0)", opacity: 0.9 },
      { transform: "scale(1)", opacity: 0 },
    ],
    { duration: DURACION_MS, easing: CURVA, fill: "forwards" },
  );
  const quitar = () => anillo.remove();
  animacion.onfinish = quitar;
  animacion.oncancel = quitar;
}

/** Ejecuta `aplicar` (que cambia las clases del tema) con el efecto de onda desde `origen`. */
export function cambiarConOnda(
  origen: HTMLElement,
  aplicar: () => void,
  oscuroAlTerminar: boolean,
) {
  const raiz = document.documentElement as HTMLElement;
  const caja = origen.getBoundingClientRect();
  const x = caja.left + caja.width / 2;
  const y = caja.top + caja.height / 2;
  // Radio hasta la esquina más lejana: la onda tiene que cubrir toda la pantalla.
  const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const doc = document as DocumentoConTransiciones;
  if (!doc.startViewTransition) {
    // Respaldo: fundido suave de los colores durante un instante.
    raiz.classList.add("cambiando-tema");
    aplicar();
    window.setTimeout(() => raiz.classList.remove("cambiando-tema"), 700);
    return;
  }

  const transicion = doc.startViewTransition(aplicar);
  void transicion.ready.then(() => {
    raiz.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`],
      },
      { duration: DURACION_MS, easing: CURVA, pseudoElement: "::view-transition-new(root)" },
    );
    lanzarAnillo(x, y, radio, oscuroAlTerminar);
  });
}
