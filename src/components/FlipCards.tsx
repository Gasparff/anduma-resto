import { Check } from "lucide-react";
import { useState } from "react";
import { IconoServicio } from "@/components/IconoServicio";
import { SERVICIOS, textoPrecio, type ServicioId } from "@/lib/eventos";
import { cn } from "@/lib/utils";

export function FlipCards({ onElegir }: { onElegir?: (id: ServicioId) => void }) {
  const [abierta, setAbierta] = useState<ServicioId | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl sm:text-3xl">Qué cocinamos para vos</h2>
        <p className="text-sm text-muted-foreground">
          Tocá una tarjeta para ver qué incluye cada servicio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICIOS.map((s, i) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            style={{ "--i": i } as React.CSSProperties}
            aria-pressed={abierta === s.id}
            aria-label={`${s.nombre}: ${s.resumen}`}
            className={cn(
              "flip-scene h-[15rem] cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
              abierta === s.id && "is-flipped",
            )}
            onClick={() => setAbierta((prev) => (prev === s.id ? null : s.id))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAbierta((prev) => (prev === s.id ? null : s.id));
              }
            }}
          >
            <div className="flip-interior flip-glow textura-cuero flex flex-col gap-2 p-4 text-[#f8eedb]">
              <h3 className="text-xl">{s.nombre}</h3>
              <ul className="space-y-1 text-xs leading-snug">
                {s.incluye.map((i) => (
                  <li key={i} className="flex gap-1.5">
                    <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[#e9c98e]" />
                    {i}
                  </li>
                ))}
              </ul>
              <p className="mt-auto text-xs font-semibold text-[#f3dba8]">{textoPrecio(s)}</p>
              {onElegir && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onElegir(s.id);
                  }}
                  className="boton-anim rounded-full bg-[#f8eedb] px-3 py-1.5 text-xs font-medium text-[#2a1b14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8eedb]"
                >
                  Pedir {s.nombre.toLowerCase()}
                </button>
              )}
            </div>

            <div className="flip-tapa flip-glow flex flex-col items-center justify-center gap-3 border bg-card p-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary dark:text-accent">
                <IconoServicio id={s.id} className="size-7" />
              </span>
              <h3 className="text-xl">{s.nombre}</h3>
              <p className="max-w-[20ch] text-xs text-muted-foreground">{s.resumen}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
