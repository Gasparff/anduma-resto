import { NEGOCIO } from "@/lib/eventos";
import { cn } from "@/lib/utils";

export function Marca({ tamano = 44, className }: { tamano?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt={`Logo de ${NEGOCIO.nombre}`}
      width={tamano}
      height={tamano}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
