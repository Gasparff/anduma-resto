import { useMemo } from "react";
import { SALONES, aISO, hoyISO, salonOcupado, type Evento, type SalonId } from "@/lib/eventos";
import { cn } from "@/lib/utils";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Props = {
  mes: Date;
  onCambiarMes: (delta: number) => void;
  eventos: Evento[];
  onSeleccionarDia: (iso: string) => void;
  modo: "chef" | "anfitrion";
  diaSeleccionado?: string | null;
  /**
   * Solo para el anfitrión: el salón que quiere usar. Un día se bloquea si ese
   * salón ya tiene un evento. Con `null` (viandas) no se bloquea ningún día.
   */
  salon?: SalonId | null;
};

export function Calendario({
  mes,
  onCambiarMes,
  eventos,
  onSeleccionarDia,
  modo,
  diaSeleccionado,
  salon = null,
}: Props) {
  const hoy = hoyISO();

  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7; // la semana arranca el lunes
    const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const items: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= diasEnMes; d++) {
      items.push(aISO(new Date(mes.getFullYear(), mes.getMonth(), d)));
    }
    return items;
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of eventos) {
      mapa.set(e.fecha, [...(mapa.get(e.fecha) ?? []), e]);
    }
    return mapa;
  }, [eventos]);

  return (
    <div className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onCambiarMes(-1)}
          aria-label="Mes anterior"
          className="boton-anim rounded-full border px-3 py-1.5 text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          ←
        </button>
        <h3 className="text-xl first-letter:uppercase sm:text-2xl">
          {mes.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </h3>
        <button
          type="button"
          onClick={() => onCambiarMes(1)}
          aria-label="Mes siguiente"
          className="boton-anim rounded-full border px-3 py-1.5 text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
        {celdas.map((iso, i) => {
          if (!iso) return <div key={`v-${i}`} />;
          const delDia = porDia.get(iso) ?? [];
          const pasado = iso < hoy;
          const ocupadoEnSalon =
            modo === "anfitrion" && salon ? salonOcupado(eventos, iso, salon) : false;
          const bloqueado = modo === "anfitrion" && (pasado || ocupadoEnSalon);
          const numero = Number(iso.slice(-2));

          let estado = "disponible";
          if (pasado) estado = "pasado";
          else if (modo === "anfitrion" && ocupadoEnSalon) estado = "ocupado";
          else if (modo === "chef" && delDia.length > 0) estado = `${delDia.length} evento(s)`;

          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueado}
              onClick={() => onSeleccionarDia(iso)}
              aria-label={`${numero}, ${estado}`}
              aria-pressed={diaSeleccionado === iso}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
                pasado && "opacity-45",
                bloqueado && "cursor-not-allowed hover:translate-y-0 hover:shadow-none",
                modo === "anfitrion" &&
                  !pasado &&
                  !ocupadoEnSalon &&
                  "border-success/50 bg-success/10",
                modo === "anfitrion" && ocupadoEnSalon && "border-destructive/50 bg-destructive/10",
                modo === "chef" && delDia.length > 0 && "border-primary/50 bg-primary/10",
                iso === hoy && "ring-2 ring-gold",
                diaSeleccionado === iso && "border-primary bg-primary/25",
              )}
            >
              <span className="font-medium">{numero}</span>
              <span className="mt-1 flex h-1.5 gap-1">
                {modo === "chef" &&
                  (["eventos", "resto"] as SalonId[]).map(
                    (s) =>
                      salonOcupado(delDia, iso, s) && (
                        <span
                          key={s}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            s === "eventos" ? "bg-primary" : "bg-gold",
                          )}
                        />
                      ),
                  )}
                {modo === "chef" && delDia.some((e) => !e.salon) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                )}
                {modo === "anfitrion" && ocupadoEnSalon && (
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {modo === "anfitrion" ? (
          <>
            <Leyenda color="bg-success" texto="Disponible" />
            <Leyenda color="bg-destructive" texto="Ocupado" />
          </>
        ) : (
          <>
            <Leyenda color="bg-primary" texto={SALONES.eventos.nombre} />
            <Leyenda color="bg-gold" texto={SALONES.resto.nombre} />
            <Leyenda color="bg-muted-foreground" texto="Viandas" />
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-gold" />
          Hoy
        </span>
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      {texto}
    </span>
  );
}
