import { Instagram, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Marca } from "@/components/Marca";
import { SelectorTema } from "@/components/SelectorTema";
import { iniciarSesionChef } from "@/lib/backend";
import { NEGOCIO, soloDigitos, urlWhatsapp } from "@/lib/eventos";
import { resolverModo, useModoBackend } from "@/lib/supabase";

type Props = {
  onChef: () => void;
  onAnfitrion: (nombre: string, telefono: string) => void;
};

const BOTON_PRIMARIO =
  "boton-anim w-full rounded-2xl bg-primary px-5 py-3.5 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Login({ onChef, onAnfitrion }: Props) {
  const [modo, setModo] = useState<"inicio" | "chef" | "anfitrion">("inicio");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  // Con la base conectada el chef entra con su correo; en modo demostración, con admin/admin.
  const conBase = useModoBackend() === "remoto";

  function elegir(siguiente: "chef" | "anfitrion") {
    setModo(siguiente);
    setError("");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:py-6">
      <div className="mb-3 flex justify-end">
        <SelectorTema />
      </div>

      <div className="grid flex-1 animate-fade-in gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section className="textura-cuero relative isolate flex flex-col justify-between gap-12 overflow-hidden [text-shadow:0_1px_10px_rgb(0_0_0/0.5)] rounded-3xl p-6 text-[#f8eedb] shadow-[var(--shadow-lift)] sm:p-10">
          {/* Foto de fondo: leve desenfoque y poca opacidad del lado izquierdo, donde va el texto */}
          <img
            src="/login-fondo.jpg"
            alt=""
            aria-hidden="true"
            className="foto-login pointer-events-none absolute inset-0 -z-10 size-full scale-105 object-cover"
          />
          <div className="flex items-center gap-3">
            <Marca tamano={64} className="ring-2 ring-[#f8eedb]/40" />
            <p className="font-display text-2xl">{NEGOCIO.nombre}</p>
          </div>

          <div>
            <h1 className="max-w-[16ch] text-4xl leading-[1.05] text-balance sm:text-6xl">
              Cocina a pedido para tus eventos
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-[#f8eedb]/90 sm:text-lg">
              Bautismos, cumpleaños, casamientos y viandas en Ciudad Demo. Mirá qué fechas están
              libres y pedí la tuya.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-[#f8eedb]/90">
            <li className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {NEGOCIO.direccion}
            </li>
            <li>
              <a
                href={urlWhatsapp(`Hola ${NEGOCIO.nombre}, quiero consultar por un evento.`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8eedb]"
              >
                <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                WhatsApp {NEGOCIO.whatsappVisible}
              </a>
            </li>
            <li>
              <a
                href={`https://www.instagram.com/${NEGOCIO.instagram[0].usuario}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8eedb]"
              >
                <Instagram aria-hidden="true" className="size-4 shrink-0" />@
                {NEGOCIO.instagram[0].usuario}
              </a>
            </li>
          </ul>
        </section>

        <section className="flex flex-col justify-center rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          {modo === "inicio" && (
            <div>
              <h2 className="text-2xl">¿Cómo querés entrar?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Elegí una opción para ver el calendario.
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => elegir("anfitrion")}
                  className={BOTON_PRIMARIO}
                >
                  Quiero reservar una fecha
                </button>
                <button
                  type="button"
                  onClick={() => elegir("chef")}
                  className="boton-anim w-full rounded-2xl border border-primary/40 bg-secondary px-5 py-3.5 font-medium text-secondary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Soy del restaurante
                </button>
              </div>
            </div>
          )}

          {modo === "chef" && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (entrando) return;
                if (!usuario.trim() || !clave.trim()) {
                  setError(
                    conBase ? "Completá correo y contraseña." : "Completá usuario y contraseña.",
                  );
                  return;
                }
                setEntrando(true);
                setError("");
                const modoActual = await resolverModo();
                if (modoActual === "remoto") {
                  const problema = await iniciarSesionChef(usuario, clave);
                  setEntrando(false);
                  if (problema) return setError(problema);
                  onChef();
                  return;
                }
                setEntrando(false);
                if (usuario.trim() === "admin" && clave === "admin") {
                  onChef();
                  return;
                }
                setError("Usuario o contraseña incorrectos.");
              }}
            >
              <h2 className="text-2xl">Acceso del restaurante</h2>
              <p className="pb-2 text-sm text-muted-foreground">
                Ingresá con tu {conBase ? "correo" : "usuario"} y contraseña.
              </p>
              <Campo
                label={conBase ? "Correo" : "Usuario"}
                value={usuario}
                onChange={setUsuario}
                {...(conBase ? { type: "email" } : {})}
                placeholder={conBase ? "tu@correo.com" : "Tu usuario"}
                autoFocus
              />
              <Campo
                label="Contraseña"
                value={clave}
                onChange={setClave}
                type="password"
                placeholder="Tu contraseña"
              />
              {error && <MensajeError texto={error} />}
              <button type="submit" disabled={entrando} className={BOTON_PRIMARIO}>
                {entrando ? "Ingresando…" : "Ingresar"}
              </button>
              <Volver onClick={() => setModo("inicio")} />
            </form>
          )}

          {modo === "anfitrion" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombre.trim()) {
                  setError("Escribí tu nombre para continuar.");
                  return;
                }
                if (soloDigitos(telefono).length < 8) {
                  setError("Escribí un WhatsApp válido, con la característica de tu zona.");
                  return;
                }
                onAnfitrion(nombre.trim(), telefono.trim());
              }}
            >
              <h2 className="text-2xl">Reservá tu fecha</h2>
              <p className="pb-2 text-sm text-muted-foreground">
                Dejanos tu contacto para que el chef pueda responderte.
              </p>
              <Campo
                label="Tu nombre"
                value={nombre}
                onChange={setNombre}
                placeholder="Ej: Valentina"
                autoFocus
              />
              <Campo
                label="Tu WhatsApp"
                value={telefono}
                onChange={setTelefono}
                type="tel"
                placeholder="Ej: 3573 44-3038"
              />
              {error && <MensajeError texto={error} />}
              <button type="submit" className={BOTON_PRIMARIO}>
                Ver fechas disponibles
              </button>
              <Volver onClick={() => setModo("inicio")} />
            </form>
          )}

          <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            Versión de demostración: los datos se guardan solo en este dispositivo.
          </p>
        </section>
      </div>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-background px-4 py-3 shadow-[0_2px_8px_rgb(0_0_0/0.35)] outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
      {texto}
    </p>
  );
}

function Volver({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl px-5 py-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Volver
    </button>
  );
}
