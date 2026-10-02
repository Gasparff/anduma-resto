import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PantallaCarga } from "@/components/PantallaCarga";
import { Login } from "@/components/Login";
import { VistaAnfitrion } from "@/components/VistaAnfitrion";
import { VistaChef } from "@/components/VistaChef";
import { cerrarSesionChef, chefConSesion } from "@/lib/backend";
import { cabeceraDe, cargarCabecera } from "@/lib/cabecera";
import { resolverModo, useModoBackend } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  // Título, descripción e ícono según la dirección web (se arman en el servidor; ver src/lib/cabecera.ts).
  loader: () => cargarCabecera(),
  head: ({ loaderData }) => cabeceraDe(loaderData),
  component: App,
});

type Sesion = { rol: "chef" } | { rol: "anfitrion"; nombre: string; telefono: string } | null;

/** Pantalla neutra: sin nombre ni marca de ninguna plataforma ni de otro restaurante. */
function PaginaNoDisponible({ conexion }: { conexion: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl">
        {conexion ? "No pudimos cargar la página" : "Página no encontrada"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {conexion
          ? "Revisá tu conexión e intentá de nuevo."
          : "La dirección que abriste no existe."}
      </p>
      {conexion && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="boton-anim mt-2 rounded-full border px-5 py-2 text-sm font-medium"
        >
          Reintentar
        </button>
      )}
    </main>
  );
}

function App() {
  const [sesion, setSesion] = useState<Sesion>(null);
  const modo = useModoBackend();

  // Con la base conectada, si el chef ya había iniciado sesión en este dispositivo entra directo.
  useEffect(() => {
    let vigente = true;
    void resolverModo().then(async (modo) => {
      if (modo === "remoto" && (await chefConSesion()) && vigente) {
        setSesion((actual) => actual ?? { rol: "chef" });
      }
    });
    return () => {
      vigente = false;
    };
  }, []);

  function salir() {
    if (sesion?.rol === "chef") void cerrarSesionChef();
    setSesion(null);
  }

  if (modo === "noencontrado" || modo === "sinconexion") {
    return <PaginaNoDisponible conexion={modo === "sinconexion"} />;
  }

  return (
    <>
      <PantallaCarga />
      {!sesion ? (
        <Login
          onChef={() => setSesion({ rol: "chef" })}
          onAnfitrion={(nombre, telefono) => setSesion({ rol: "anfitrion", nombre, telefono })}
        />
      ) : (
        <div className="animate-fade-in">
          {sesion.rol === "chef" ? (
            <VistaChef onSalir={salir} />
          ) : (
            <VistaAnfitrion nombre={sesion.nombre} telefono={sesion.telefono} onSalir={salir} />
          )}
        </div>
      )}
    </>
  );
}
