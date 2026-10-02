import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Login } from "@/components/Login";
import { VistaAnfitrion } from "@/components/VistaAnfitrion";
import { VistaChef } from "@/components/VistaChef";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anduma Resto — Eventos y viandas en Villa del Rosario" },
      {
        name: "description",
        content:
          "Cocina a pedido para bautismos, cumpleaños, casamientos y viandas en Villa del Rosario, Córdoba. Mirá las fechas libres y pedí la tuya.",
      },
      { property: "og:title", content: "Anduma Resto — Cocina a pedido para tus eventos" },
      {
        property: "og:description",
        content:
          "Calendario de fechas libres y pedidos de reserva para bautismos, cumpleaños, casamientos y viandas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Sesion = { rol: "chef" } | { rol: "anfitrion"; nombre: string; telefono: string } | null;

function App() {
  const [sesion, setSesion] = useState<Sesion>(null);

  if (!sesion) {
    return (
      <Login
        onChef={() => setSesion({ rol: "chef" })}
        onAnfitrion={(nombre, telefono) => setSesion({ rol: "anfitrion", nombre, telefono })}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {sesion.rol === "chef" ? (
        <VistaChef onSalir={() => setSesion(null)} />
      ) : (
        <VistaAnfitrion
          nombre={sesion.nombre}
          telefono={sesion.telefono}
          onSalir={() => setSesion(null)}
        />
      )}
    </div>
  );
}
