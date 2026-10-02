import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { IconoServicio } from "@/components/IconoServicio";
import { SERVICIOS, textoPrecio, type ServicioId } from "@/lib/eventos";
import { cn } from "@/lib/utils";

export function FlipCards({ onElegir }: { onElegir?: (id: ServicioId) => void }) {
  // Una sola tarjeta abierta a la vez: al abrir otra, las demás vuelven a su posición original.
  const [abierta, setAbierta] = useState<ServicioId | null>(null);
  // Tarjeta fijada con un clic: se queda abierta aunque el mouse salga.
  const fijada = useRef<ServicioId | null>(null);

  function alternar(id: ServicioId) {
    fijada.current = fijada.current === id ? null : id;
    setAbierta(fijada.current);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl sm:text-3xl">Qué cocinamos para vos</h2>
        <p className="text-sm text-muted-foreground">
          Tocá una tarjeta para ver qué incluye cada servicio.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SERVICIOS.map((s, i) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            style={{ "--i": i } as React.CSSProperties}
            aria-pressed={abierta === s.id}
            aria-label={`${s.nombre}: ${s.resumen}`}
            className={cn(
              "flip-scene h-[13.5rem] cursor-pointer sm:h-[15rem] rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              abierta === s.id && "is-flipped",
            )}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              if (fijada.current !== s.id) fijada.current = null;
              setAbierta(s.id);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse" || fijada.current === s.id) return;
              setAbierta((prev) => (prev === s.id ? null : prev));
            }}
            onClick={() => alternar(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                alternar(s.id);
              }
            }}
          >
            <div className="flip-back flip-glow textura-cuero flex flex-col gap-1.5 p-3 text-[#f8eedb] sm:gap-2 sm:p-4">
              <h3 className="text-lg sm:text-xl">{s.nombre}</h3>
              <ul className="space-y-0.5 text-[11px] leading-tight sm:space-y-1 sm:text-xs sm:leading-snug">
                {s.incluye.map((i) => (
                  <li key={i} className="flex gap-1 sm:gap-1.5 max-sm:nth-[n+4]:hidden">
                    <Check
                      aria-hidden="true"
                      className="mt-px size-3 shrink-0 text-[#e9c98e] sm:mt-0.5 sm:size-3.5"
                    />
                    {i}
                  </li>
                ))}
              </ul>
              <p className="mt-auto text-[11px] font-semibold leading-tight text-[#f3dba8] sm:text-xs">
                {textoPrecio(s)}
              </p>
              {onElegir && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onElegir(s.id);
                  }}
                  className="boton-anim rounded-full bg-[#f8eedb] px-2 py-1 text-[11px] font-medium text-[#2a1b14] sm:px-3 sm:py-1.5 sm:text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8eedb]"
                >
                  Pedir {s.nombre.toLowerCase()}
                </button>
              )}
            </div>

            <div className="flip-front flip-glow flex flex-col items-center justify-center gap-2 border bg-card p-3 text-center sm:gap-3 sm:p-4">
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary sm:size-14 dark:text-accent">
                <IconoServicio id={s.id} className="size-5 sm:size-7" />
              </span>
              <h3 className="text-lg sm:text-xl">{s.nombre}</h3>
              <p className="max-w-[20ch] text-[11px] leading-snug text-muted-foreground sm:text-xs">
                {s.resumen}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
