import { useMemo, useRef } from "react";
import {
  LISTA_SALONES,
  SERVICIOS,
  aISO,
  hoyISO,
  salonOcupado,
  type Evento,
  type SalonId,
} from "@/lib/eventos";
import { cn } from "@/lib/utils";

// Un color por salón, en el orden en que se muestran (el primero es el más grande).
const COLORES_SALON = ["bg-primary", "bg-gold", "bg-success", "bg-destructive"];

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

  // Dirección del cambio de mes, para que la grilla se deslice hacia donde se navega.
  const mesAnterior = useRef(mes);
  const sentido = useRef<"sig" | "ant">("sig");
  if (mes.getTime() !== mesAnterior.current.getTime()) {
    sentido.current = mes > mesAnterior.current ? "sig" : "ant";
    mesAnterior.current = mes;
  }

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
    <div className="rounded-[2rem] border border-border/40 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onCambiarMes(-1)}
          aria-label="Mes anterior"
          className="boton-anim flex size-9 items-center justify-center rounded-full bg-secondary/60 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          className="boton-anim flex size-9 items-center justify-center rounded-full bg-secondary/60 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-normal uppercase tracking-wider text-muted-foreground/70">
        {DIAS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div
        key={mes.getTime()}
        className={cn(
          "mt-2 grid grid-cols-7 gap-1.5 sm:gap-2",
          sentido.current === "sig" ? "mes-sig" : "mes-ant",
        )}
      >
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
                "relative flex aspect-square flex-col items-center justify-center rounded-full border border-transparent text-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "hover:bg-secondary/70",
                pasado && "opacity-35",
                bloqueado && "cursor-not-allowed hover:bg-transparent",
                modo === "anfitrion" && !pasado && !ocupadoEnSalon && "bg-success/10",
                modo === "anfitrion" && ocupadoEnSalon && "bg-destructive/10",
                modo === "chef" && delDia.length > 0 && "bg-primary/10",
                iso === hoy && "ring-1 ring-gold/70",
                diaSeleccionado === iso && "dia-pop bg-primary/30 shadow-[var(--shadow-soft)]",
              )}
            >
              <span className="font-normal">{numero}</span>
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {modo === "chef" &&
                  LISTA_SALONES.map(
                    (s, i) =>
                      salonOcupado(delDia, iso, s.id) && (
                        <span
                          key={s.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            COLORES_SALON[i % COLORES_SALON.length],
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
            {LISTA_SALONES.map((s, i) => (
              <Leyenda
                key={s.id}
                color={COLORES_SALON[i % COLORES_SALON.length] ?? "bg-primary"}
                texto={s.nombre}
              />
            ))}
            <Leyenda
              color="bg-muted-foreground"
              texto={SERVICIOS.find((x) => !x.usaSalon)?.nombre ?? "Sin salón"}
            />
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
