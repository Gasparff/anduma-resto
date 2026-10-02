import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cambiarConOnda } from "@/lib/onda-tema";

const CLAVE_TEMA = "anduma-tema";

export function SelectorTema() {
  const cambiarTema = (e: React.MouseEvent<HTMLButtonElement>) => {
    const raiz = document.documentElement;
    const oscuroAlTerminar = !raiz.classList.contains("dark");
    const aplicar = () => {
      raiz.classList.toggle("dark", oscuroAlTerminar);
      raiz.style.colorScheme = oscuroAlTerminar ? "dark" : "light";
      try {
        window.localStorage.setItem(CLAVE_TEMA, oscuroAlTerminar ? "oscuro" : "claro");
      } catch {
        // Sin almacenamiento: el cambio vale solo para esta visita.
      }
    };
    cambiarConOnda(e.currentTarget, aplicar, oscuroAlTerminar);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={cambiarTema}
      aria-label="Cambiar modo de color"
      title="Cambiar modo de color"
      className="boton-anim h-9 w-14 sm:h-11 sm:w-20 shrink-0 rounded-full bg-background/80 shadow-sm backdrop-blur"
    >
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
    </Button>
  );
}
