import { Cake, Church, Heart, Package, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { servicioPorId, type ServicioId } from "@/lib/eventos";

// Íconos conocidos por código de servicio; cualquier otro usa uno genérico según la unidad.
const ICONOS: Record<string, LucideIcon> = {
  bautismos: Church,
  cumpleanos: Cake,
  casamientos: Heart,
  viandas: Package,
};

export function IconoServicio({ id, className }: { id: ServicioId; className?: string }) {
  const Icono = ICONOS[id] ?? (servicioPorId(id).unidad === "viandas" ? Package : UtensilsCrossed);
  return <Icono aria-hidden="true" className={className} strokeWidth={1.5} />;
}
