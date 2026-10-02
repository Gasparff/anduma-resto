import { MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Calendario } from "@/components/Calendario";
import { Desplegable } from "@/components/Desplegable";
import { Encabezado } from "@/components/Encabezado";
import { FlipCards } from "@/components/FlipCards";
import { PieContacto } from "@/components/PieContacto";
import { EstadoTag } from "@/components/VistaChef";
import {
  LISTA_SALONES,
  NEGOCIO,
  SALONES,
  SERVICIOS,
  calcularPresupuesto,
  capacidadMaxima,
  formatearFecha,
  formatearPesos,
  hoyISO,
  salonOcupado,
  salonSugerido,
  servicioPorId,
  soloDigitos,
  urlWhatsapp,
  useDatos,
  type SalonId,
  type ServicioId,
} from "@/lib/eventos";
import { cn } from "@/lib/utils";

const DIETAS = [
  "Celíaco (sin TACC)",
  "Vegetariano",
  "Vegano",
  "Sin lactosa",
  "Diabético",
  "Sin frutos secos",
];

const CAMPO =
  "w-full rounded-xl border bg-background px-4 py-2.5 outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

type Props = { nombre: string; telefono: string; onSalir: () => void };

export function VistaAnfitrion({ nombre, telefono, onSalir }: Props) {
  const { datos, crearSolicitud } = useDatos();
  const [mes, setMes] = useState(() => new Date());
  const [dia, setDia] = useState<string | null>(null);
  const [servicio, setServicio] = useState<ServicioId>("cumpleanos");
  const [salon, setSalon] = useState<SalonId>("eventos");
  const [hora, setHora] = useState(servicioPorId("cumpleanos").horaSugerida);
  const [personas, setPersonas] = useState("");
  const [comentario, setComentario] = useState("");
  const [dietas, setDietas] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [enviada, setEnviada] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const agendaRef = useRef<HTMLDivElement>(null);

  const info = servicioPorId(servicio);
  const cantidad = Number(personas);
  const presupuesto = calcularPresupuesto(servicio, info.usaSalon ? salon : undefined, cantidad);
  const salonDelCalendario = info.usaSalon ? salon : null;

  const misSolicitudes = datos.solicitudes.filter(
    (s) => soloDigitos(s.telefono) === soloDigitos(telefono),
  );

  function cambiarServicio(id: ServicioId) {
    const nuevo = servicioPorId(id);
    setServicio(id);
    setHora(nuevo.horaSugerida);
    setEnviada(null);
    setError("");
    if (dia && nuevo.usaSalon && salonOcupado(datos.eventos, dia, salon)) setDia(null);
  }

  function cambiarSalon(id: SalonId) {
    setSalon(id);
    setError("");
    if (dia && salonOcupado(datos.eventos, dia, id)) {
      setDia(null);
      setError(`El ${SALONES[id].nombre} está ocupado ese día. Elegí otra fecha.`);
    }
  }

  function cambiarPersonas(valor: string) {
    setPersonas(valor);
    const n = Number(valor);
    // Si el grupo no entra en el salón elegido, pasamos al salón grande.
    if (info.usaSalon && n > SALONES[salon].capacidad) cambiarSalon(salonSugerido(n));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviada(null);
    if (!dia) return setError("Elegí primero un día libre en el calendario.");
    if (!cantidad || cantidad < 1) return setError(`Indicá la cantidad de ${info.unidad}.`);
    const max = capacidadMaxima(servicio, info.usaSalon ? salon : undefined);
    if (cantidad > max) {
      return setError(
        info.usaSalon
          ? `El ${SALONES[salon].nombre} admite hasta ${max} personas.`
          : `El máximo por pedido es de ${max} viandas.`,
      );
    }
    if (dia < hoyISO()) return setError("No se pueden pedir días pasados.");
    if (info.usaSalon && salonOcupado(datos.eventos, dia, salon))
      return setError("Ese salón ya está ocupado ese día.");

    crearSolicitud({
      anfitrion: nombre,
      telefono,
      fecha: dia,
      hora,
      servicio,
      salon: info.usaSalon ? salon : undefined,
      personas: cantidad,
      comentario: comentario.trim(),
      dietas,
      presupuesto: presupuesto?.total,
    });

    const lugar = info.usaSalon ? ` en el ${SALONES[salon].nombre}` : "";
    setEnviada(
      `Hola ${NEGOCIO.nombre}, soy ${nombre}. Acabo de enviar un pedido de ${info.singular.toLowerCase()} para el ${formatearFecha(
        dia,
      )} a las ${hora}${lugar}, para ${cantidad} ${info.unidad}.${
        presupuesto ? ` Presupuesto estimado: ${formatearPesos(presupuesto.total)}.` : ""
      }`,
    );
    setError("");
    setPersonas("");
    setComentario("");
    setDietas([]);
    setDia(null);
  }

  return (
    <div className="min-h-screen">
      <Encabezado
        titulo={`Hola, ${nombre}`}
        subtitulo="Elegí un servicio, un día libre y mandanos tu pedido."
        onSalir={onSalir}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <FlipCards
          onElegir={(id) => {
            cambiarServicio(id);
            agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <div ref={agendaRef} className="grid scroll-mt-28 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl sm:text-3xl">Fechas disponibles</h2>
              <p className="text-sm text-muted-foreground">
                {info.usaSalon
                  ? `Mostramos los días libres del ${SALONES[salon].nombre}.`
                  : "Las viandas no ocupan salón: podés pedir cualquier día."}
              </p>
            </div>
            <Calendario
              mes={mes}
              onCambiarMes={(d) => setMes(new Date(mes.getFullYear(), mes.getMonth() + d, 1))}
              eventos={datos.eventos}
              onSeleccionarDia={(iso) => {
                setDia(iso);
                setError("");
                setEnviada(null);
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              modo="anfitrion"
              diaSeleccionado={dia}
              salon={salonDelCalendario}
            />
          </div>

          <div
            ref={formRef}
            className="self-start rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <h2 className="text-xl">Tu pedido</h2>
            <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
              {dia ? formatearFecha(dia) : "Ningún día seleccionado"}
            </p>

            <form noValidate onSubmit={enviar} className="mt-4 space-y-3 text-sm">
              <div className="block">
                <span className="mb-1 block font-medium">Servicio</span>
                <Desplegable
                  value={servicio}
                  onChange={cambiarServicio}
                  ariaLabel="Servicio"
                  opciones={SERVICIOS.map((s) => ({ valor: s.id, texto: s.nombre }))}
                />
              </div>

              {info.usaSalon && (
                <fieldset className="aparece-abajo">
                  <legend className="mb-1 font-medium">Salón</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {LISTA_SALONES.map((s) => {
                      const sinCupo = cantidad > s.capacidad;
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            "flex cursor-pointer flex-col rounded-xl border bg-background px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            sinCupo && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <input
                            type="radio"
                            name="salon"
                            value={s.id}
                            checked={salon === s.id}
                            disabled={sinCupo}
                            onChange={() => cambiarSalon(s.id)}
                            className="sr-only"
                          />
                          <span className="font-medium">{s.nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            Hasta {s.capacidad} personas
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-medium">
                    {info.unidad === "viandas" ? "Viandas" : "Personas"}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={capacidadMaxima(servicio, info.usaSalon ? salon : undefined)}
                    value={personas}
                    onChange={(e) => cambiarPersonas(e.target.value)}
                    placeholder="Cantidad"
                    className={CAMPO}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-medium">
                    {info.usaSalon ? "Hora de inicio" : "Hora de entrega"}
                  </span>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className={CAMPO}
                  />
                </label>
              </div>

              <fieldset className="rounded-xl border bg-background px-4 py-3">
                <legend className="px-1 text-xs text-muted-foreground">
                  Opciones de menú especiales
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DIETAS.map((d) => (
                    <label key={d} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dietas.includes(d)}
                        onChange={() =>
                          setDietas((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                          )
                        }
                        className="accent-[var(--primary)]"
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1 block font-medium">Comentarios</span>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Alergias, tipo de menú que imaginás, lo que quieras contarnos"
                  rows={3}
                  className={CAMPO}
                />
              </label>

              {presupuesto && (
                <div className="rounded-xl bg-secondary px-4 py-3" aria-live="polite">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">Presupuesto estimado</span>
                    <span className="font-display text-xl">
                      {formatearPesos(presupuesto.total)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cantidad} {info.unidad} × {formatearPesos(presupuesto.unitario)}
                    {presupuesto.recargoSalon > 0 &&
                      ` + ${formatearPesos(presupuesto.recargoSalon)} del ${SALONES[salon].nombre}`}
                    . Es un valor orientativo: el precio final lo confirma el chef.
                  </p>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {enviada && (
                <div role="status" className="space-y-2 rounded-xl bg-success/10 p-3 text-success">
                  <p className="font-medium">¡Listo! Tu pedido quedó pendiente de confirmación.</p>
                  <a
                    href={urlWhatsapp(enviada)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                    Avisar por WhatsApp al {NEGOCIO.whatsappVisible}
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="boton-anim w-full rounded-2xl bg-primary px-4 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Enviar pedido
              </button>
            </form>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg">Mis pedidos</h3>
              <div className="mt-2 space-y-2">
                {misSolicitudes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no enviaste ninguno.</p>
                )}
                {misSolicitudes
                  .slice()
                  .reverse()
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="first-letter:uppercase">{formatearFecha(s.fecha)}</p>
                        <p className="text-muted-foreground">
                          {servicioPorId(s.servicio).nombre} · {s.personas}{" "}
                          {servicioPorId(s.servicio).unidad}
                          {s.salon ? ` · ${SALONES[s.salon].nombre}` : ""}
                        </p>
                      </div>
                      <EstadoTag estado={s.estado} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PieContacto />
    </div>
  );
}
