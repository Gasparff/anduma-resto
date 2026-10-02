import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const CLAVE_TEMA = "anduma-tema";

export function SelectorTema() {
  const cambiarTema = () => {
    const oscuro = document.documentElement.classList.toggle("dark");
    const siguiente = oscuro ? "oscuro" : "claro";
    document.documentElement.style.colorScheme = oscuro ? "dark" : "light";
    try {
      window.localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {
      // Sin almacenamiento: el cambio vale solo para esta visita.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={cambiarTema}
      aria-label="Cambiar modo de color"
      title="Cambiar modo de color"
      className="h-11 w-20 shrink-0 rounded-full bg-background/80 shadow-sm backdrop-blur"
    >
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
    </Button>
  );
}
