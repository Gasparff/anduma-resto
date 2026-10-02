import { useEffect, useState } from "react";

const DURACION_MS = 2000;
const SALIDA_MS = 400;

/** Pantalla de carga inicial: cinco círculos que laten (Uiverse.io, Li-Deheng). */
export function PantallaCarga() {
  const [fase, setFase] = useState<"visible" | "saliendo" | "oculta">("visible");

  useEffect(() => {
    const salir = window.setTimeout(() => setFase("saliendo"), DURACION_MS);
    const ocultar = window.setTimeout(() => setFase("oculta"), DURACION_MS + SALIDA_MS);
    return () => {
      window.clearTimeout(salir);
      window.clearTimeout(ocultar);
    };
  }, []);

  if (fase === "oculta") return null;

  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`pantalla-carga ${fase === "saliendo" ? "pantalla-carga--sale" : ""}`}
    >
      <div className="cargador">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="circle">
            <div className="dot" />
            <div className="outline" />
          </div>
        ))}
      </div>
    </div>
  );
}
