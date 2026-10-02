import { useEffect, useState } from "react";
import { useModoBackend } from "@/lib/supabase";

const DURACION_MS = 2000;
const SALIDA_MS = 400;
/** Si averiguar el negocio tarda más que esto, se muestra igual lo que haya. */
const ESPERA_MAXIMA_MS = 8000;

/** Pantalla de carga inicial: cuatro círculos que laten (Uiverse.io, Li-Deheng). */
export function PantallaCarga() {
  const [fase, setFase] = useState<"visible" | "saliendo" | "oculta">("visible");
  const [minimoCumplido, setMinimoCumplido] = useState(false);
  const [esperaAgotada, setEsperaAgotada] = useState(false);
  // No se muestra nada del negocio hasta saber cuál es: así no se ve por un instante la marca de otro.
  const listo = useModoBackend() !== "cargando";

  useEffect(() => {
    const minimo = window.setTimeout(() => setMinimoCumplido(true), DURACION_MS);
    const maximo = window.setTimeout(() => setEsperaAgotada(true), ESPERA_MAXIMA_MS);
    return () => {
      window.clearTimeout(minimo);
      window.clearTimeout(maximo);
    };
  }, []);

  useEffect(() => {
    if (!minimoCumplido || !(listo || esperaAgotada)) return;
    setFase("saliendo");
    const ocultar = window.setTimeout(() => setFase("oculta"), SALIDA_MS);
    return () => window.clearTimeout(ocultar);
  }, [minimoCumplido, listo, esperaAgotada]);

  if (fase === "oculta") return null;

  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`pantalla-carga ${fase === "saliendo" ? "pantalla-carga--sale" : ""}`}
    >
      <div className="cargador">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="circle">
            <div className="dot" />
            <div className="outline" />
          </div>
        ))}
      </div>
    </div>
  );
}
