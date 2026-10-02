import { NEGOCIO } from "@/lib/eventos";
import { cn } from "@/lib/utils";

/** Iniciales del nombre del negocio (para negocios que todavía no cargaron su logo). */
function iniciales(nombre: string) {
  const palabras = nombre.split(/\s+/).filter((p) => /\p{L}/u.test(p));
  const letras = palabras.length > 1 ? palabras.slice(0, 2).map((p) => p[0]) : [palabras[0]?.[0]];
  return letras.join("").toUpperCase() || "•";
}

export function Marca({ tamano = 44, className }: { tamano?: number; className?: string }) {
  if (!NEGOCIO.logoUrl) {
    return (
      <span
        role="img"
        aria-label={`Logo de ${NEGOCIO.nombre}`}
        style={{ width: tamano, height: tamano, fontSize: tamano * 0.4 }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary font-display text-primary-foreground",
          className,
        )}
      >
        {iniciales(NEGOCIO.nombre)}
      </span>
    );
  }
  return (
    <img
      src={NEGOCIO.logoUrl}
      alt={`Logo de ${NEGOCIO.nombre}`}
      width={tamano}
      height={tamano}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
