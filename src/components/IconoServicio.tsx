import { Cake, Church, Heart, Package, type LucideIcon } from "lucide-react";
import type { ServicioId } from "@/lib/eventos";

const ICONOS: Record<ServicioId, LucideIcon> = {
  bautismos: Church,
  cumpleanos: Cake,
  casamientos: Heart,
  viandas: Package,
};

export function IconoServicio({ id, className }: { id: ServicioId; className?: string }) {
  const Icono = ICONOS[id];
  return <Icono aria-hidden="true" className={className} strokeWidth={1.5} />;
}
