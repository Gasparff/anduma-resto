import { Desplegable } from "@/components/Desplegable";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Calendario } from "@/components/Calendario";
import { Encabezado } from "@/components/Encabezado";
import { PieContacto } from "@/components/PieContacto";
import {
  LISTA_SALONES,
  NEGOCIO,
  SERVICIOS,
  capacidadMaxima,
  formatearFecha,
  hoyISO,
  salonOcupado,
  salonInicial,
  salonSugerido,
  servicioInicial,
  servicioPorId,
  formatearPesos,
  telefonoWhatsapp,
  urlWhatsapp,
  useDatos,
  type SalonId,
  type ServicioId,
  type Solicitud,
  salonPorId,
} from "@/lib/eventos";
import { cn } from "@/lib/utils";

const CAMPO =
  "w-full rounded-xl border bg-background px-4 py-2.5 outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

export function VistaChef({ onSalir }: { onSalir: () => void }) {
  const { datos, modo, agregarEvento, eliminarEvento, responderSolicitud, reiniciarDemo } =
    useDatos("chef");
  const [mes, setMes] = useState(() => new Date());
  const [dia, setDia] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [personas, setPersonas] = useState("");
  const [servicio, setServicio] = useState<ServicioId>(servicioInicial);
  const [salon, setSalon] = useState<SalonId>(salonInicial);
  const [hora, setHora] = useState("21:00");
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [confirmaReinicio, setConfirmaReinicio] = useState(false);

  const info = servicioPorId(servicio);
  const eventosDelDia = dia ? datos.eventos.filter((e) => e.fecha === dia) : [];
  const pendientes = datos.solicitudes.filter((s) => s.estado === "pendiente");

  function cambiarServicio(id: ServicioId) {
    setServicio(id);
    setHora(servicioPorId(id).horaSugerida);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!dia) return;
    const cantidad = Number(personas);
    if (!nombre.trim()) return setError("Poné un nombre al evento.");
    if (!cantidad || cantidad < 1) return setError(`Indicá la cantidad de ${info.unidad}.`);
    const max = capacidadMaxima(servicio, info.usaSalon ? salon : undefined);
    if (cantidad > max)
      return setError(
        info.usaSalon
          ? `El ${salonPorId(salon).nombre} admite hasta ${max} personas.`
          : `El máximo por pedido es de ${max} viandas.`,
      );
    if (!hora) return setError("Elegí una hora.");
    if (dia < hoyISO()) return setError("No se pueden agendar días pasados.");
    if (info.usaSalon && salonOcupado(datos.eventos, dia, salon))
      return setError(`El ${salonPorId(salon).nombre} ya tiene un evento ese día.`);

    const problema = await agregarEvento({
      fecha: dia,
      nombre: nombre.trim(),
      personas: cantidad,
      servicio,
      hora,
      salon: info.usaSalon ? salon : undefined,
    });
    if (problema) return setError(problema);
    setNombre("");
    setPersonas("");
    setError("");
  }

  async function responder(s: Solicitud, estado: "confirmada" | "rechazada") {
    const problema = await responderSolicitud(s.id, estado);
    setAvisos((prev) => {
      const siguiente = { ...prev };
      if (problema) siguiente[s.id] = problema;
      else delete siguiente[s.id];
      return siguiente;
    });
  }

  function mensajeParaAnfitrion(s: Solicitud) {
    const servicioDe = servicioPorId(s.servicio);
    const estado =
      s.estado === "confirmada"
        ? "quedó confirmado"
        : s.estado === "rechazada"
          ? "lamentablemente no podemos tomarlo"
          : "lo estamos revisando";
    return `Hola ${s.anfitrion}, te escribimos de ${NEGOCIO.nombre}. Tu pedido de ${servicioDe.singular.toLowerCase()} para el ${formatearFecha(
      s.fecha,
    )} ${estado}.`;
  }

  return (
    <div className="min-h-screen">
      <Encabezado
        titulo="Agenda del restaurante"
        subtitulo="Los eventos de cada salón y los pedidos que van llegando."
        onSalir={onSalir}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Calendario
            mes={mes}
            onCambiarMes={(d) => setMes(new Date(mes.getFullYear(), mes.getMonth() + d, 1))}
            eventos={datos.eventos}
            onSeleccionarDia={(iso) => {
              setDia(iso);
              setError("");
            }}
            modo="chef"
            diaSeleccionado={dia}
          />

          <aside className="self-start rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            {!dia ? (
              <p className="text-sm text-muted-foreground">
                Elegí un día del calendario para ver sus eventos o agendar uno nuevo.
              </p>
            ) : (
              <div className="space-y-5">
                <h2 className="text-xl first-letter:uppercase">{formatearFecha(dia)}</h2>

                <div className="space-y-2">
                  {eventosDelDia.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin eventos este día.</p>
                  )}
                  {eventosDelDia.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-secondary px-4 py-3"
                    >
                      <div className="text-sm">
                        <p className="font-medium">{ev.nombre}</p>
                        <p className="text-muted-foreground">
                          {ev.hora} · {ev.personas} {servicioPorId(ev.servicio).unidad}
                        </p>
                        <p className="text-muted-foreground">
                          {servicioPorId(ev.servicio).nombre}
                          {ev.salon ? ` · ${salonPorId(ev.salon).nombre}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void eliminarEvento(ev.id)}
                        className="boton-anim rounded-full px-2 py-1 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`Eliminar ${ev.nombre}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>

                <form noValidate onSubmit={guardar} className="space-y-3 border-t pt-4 text-sm">
                  <h3 className="text-lg">Agendar evento</h3>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del evento"
                    aria-label="Nombre del evento"
                    className={CAMPO}
                  />
                  <Desplegable
                    value={servicio}
                    onChange={cambiarServicio}
                    ariaLabel="Servicio"
                    opciones={SERVICIOS.map((s) => ({ valor: s.id, texto: s.nombre }))}
                  />
                  {info.usaSalon && (
                    <Desplegable
                      value={salon}
                      onChange={setSalon}
                      ariaLabel="Salón"
                      className="aparece-abajo"
                      opciones={LISTA_SALONES.map((s) => ({
                        valor: s.id,
                        texto: `${s.nombre} (hasta ${s.capacidad})`,
                      }))}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={personas}
                      onChange={(e) => {
                        setPersonas(e.target.value);
                        if (info.usaSalon && Number(e.target.value) > salonPorId(salon).capacidad)
                          setSalon(salonSugerido(Number(e.target.value)));
                      }}
                      placeholder={info.unidad === "viandas" ? "Viandas" : "Personas"}
                      aria-label={info.unidad === "viandas" ? "Viandas" : "Personas"}
                      className={CAMPO}
                    />
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      aria-label="Hora"
                      className={CAMPO}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="boton-anim w-full rounded-2xl bg-primary px-4 py-2.5 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Guardar evento
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl">
            Pedidos recibidos{" "}
            <span className="align-middle font-sans text-sm text-muted-foreground">
              ({pendientes.length} pendientes)
            </span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {datos.solicitudes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay pedidos. Cuando alguien reserve una fecha, lo vas a ver acá.
              </p>
            )}
            {datos.solicitudes
              .slice()
              .reverse()
              .map((s) => {
                const servicioDe = servicioPorId(s.servicio);
                return (
                  <article
                    key={s.id}
                    className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.anfitrion}</p>
                        <p className="text-sm text-muted-foreground first-letter:uppercase">
                          {formatearFecha(s.fecha)} · {s.hora}
                        </p>
                      </div>
                      <EstadoTag estado={s.estado} />
                    </div>
                    <p className="mt-2 text-sm">
                      {servicioDe.nombre} · {s.personas} {servicioDe.unidad}
                      {s.salon ? ` · ${salonPorId(s.salon).nombre}` : ""}
                    </p>
                    {s.presupuesto && (
                      <p className="mt-1 text-sm">
                        Presupuesto estimado: {formatearPesos(s.presupuesto)}
                      </p>
                    )}
                    {s.dietas && s.dietas.length > 0 && (
                      <p className="mt-1 text-sm">Menú especial: {s.dietas.join(", ")}</p>
                    )}
                    {s.comentario && (
                      <p className="mt-1 text-sm text-muted-foreground italic">“{s.comentario}”</p>
                    )}
                    <a
                      href={urlWhatsapp(mensajeParaAnfitrion(s), telefonoWhatsapp(s.telefono))}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <MessageCircle aria-hidden="true" className="size-4" />
                      Escribirle por WhatsApp ({s.telefono})
                    </a>
                    {avisos[s.id] && (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        {avisos[s.id]}
                      </p>
                    )}
                    {s.estado === "pendiente" && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => responder(s, "confirmada")}
                          className="boton-anim rounded-full bg-success px-4 py-2 text-sm font-medium text-success-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => responder(s, "rechazada")}
                          className="boton-anim rounded-full border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </section>

        {modo === "local" && (
          <section className="rounded-3xl border border-dashed p-5 text-sm">
            <h2 className="text-lg">Modo demostración</h2>
            <p className="mt-1 max-w-[60ch] text-muted-foreground">
              Estos datos son de ejemplo y se guardan solo en este dispositivo. Antes de mostrar la
              aplicación, podés volver a cargarlos.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!confirmaReinicio) {
                  setConfirmaReinicio(true);
                  window.setTimeout(() => setConfirmaReinicio(false), 4000);
                  return;
                }
                reiniciarDemo();
                setDia(null);
                setAvisos({});
                setConfirmaReinicio(false);
              }}
              className={cn(
                "boton-anim mt-3 rounded-full border px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                confirmaReinicio
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "hover:bg-secondary",
              )}
            >
              {confirmaReinicio ? "Tocá de nuevo para confirmar" : "Cargar datos de ejemplo"}
            </button>
          </section>
        )}
      </main>

      <PieContacto />
    </div>
  );
}

export function EstadoTag({ estado }: { estado: "pendiente" | "confirmada" | "rechazada" }) {
  const estilos = {
    pendiente: "bg-warning/25 text-foreground",
    confirmada: "bg-success/20 text-success",
    rechazada: "bg-destructive/15 text-destructive",
  } as const;
  const texto = {
    pendiente: "Pendiente",
    confirmada: "Confirmado",
    rechazada: "Rechazado",
  } as const;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${estilos[estado]}`}>
      {texto[estado]}
    </span>
  );
}
