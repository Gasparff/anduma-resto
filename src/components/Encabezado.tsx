import { LogOut } from "lucide-react";
import { Marca } from "@/components/Marca";
import { SelectorTema } from "@/components/SelectorTema";
import { Button } from "@/components/ui/button";
import { NEGOCIO } from "@/lib/eventos";

export function Encabezado({
  titulo,
  subtitulo,
  onSalir,
}: {
  titulo: string;
  subtitulo: string;
  onSalir: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Marca tamano={48} />
          <div>
            <p className="text-sm text-muted-foreground">{NEGOCIO.nombre}</p>
            <h1 className="font-display text-xl leading-tight sm:text-2xl">{titulo}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SelectorTema />
          <Button
            type="button"
            variant="outline"
            onClick={onSalir}
            className="boton-anim rounded-full border-primary/30 bg-background/80 backdrop-blur"
          >
            <LogOut aria-hidden="true" />
            Salir
          </Button>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">{subtitulo}</p>
    </header>
  );
}
