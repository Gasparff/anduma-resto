import { Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { Marca } from "@/components/Marca";
import { NEGOCIO, urlWhatsapp } from "@/lib/eventos";

export function PieContacto() {
  return (
    <footer className="border-t bg-card/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
          <Marca tamano={56} />
          <div>
            <p className="font-display text-xl">{NEGOCIO.nombre}</p>
            <p className="mt-1 max-w-[28ch] text-muted-foreground">
              Cocina a pedido para eventos y viandas todos los días.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg">Dónde estamos</h2>
          <p className="mt-2 flex gap-2 text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {NEGOCIO.direccion}
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg">Horarios</h2>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {NEGOCIO.horarios.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg">Escribinos</h2>
          <ul className="mt-2 space-y-2">
            <li>
              <a
                href={urlWhatsapp("Hola Anduma, quiero consultar por un evento.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp {NEGOCIO.whatsappVisible}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${NEGOCIO.email}`}
                className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Mail aria-hidden="true" className="size-4" />
                {NEGOCIO.email}
              </a>
            </li>
            {NEGOCIO.instagram.map((ig) => (
              <li key={ig.usuario}>
                <a
                  href={`https://www.instagram.com/${ig.usuario}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Instagram aria-hidden="true" className="size-4" />@{ig.usuario}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
