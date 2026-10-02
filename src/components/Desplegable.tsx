import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opcion<T extends string> = { valor: T; texto: string };

type Props<T extends string> = {
  value: T;
  onChange: (valor: T) => void;
  opciones: Opcion<T>[];
  ariaLabel: string;
  className?: string;
};

/** Menú desplegable con animación de deslizamiento hacia abajo (reemplaza al <select> nativo, que no se puede animar). */
export function Desplegable<T extends string>({
  value,
  onChange,
  opciones,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-auto rounded-xl border bg-background px-4 py-2.5 text-sm shadow-none focus:ring-2 focus:ring-ring",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="desplegable-abajo rounded-xl p-1 shadow-[var(--shadow-lift)]">
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor} className="rounded-lg py-2 text-sm">
            {o.texto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
