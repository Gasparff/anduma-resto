# Anduma Resto

App de reservas de eventos para Anduma Resto (Villa del Rosario, Córdoba): bautismos, cumpleaños, casamientos y viandas. Dos vistas: **anfitrión** (pide una fecha) y **chef** (acepta o rechaza, con calendario por salón).

> Estado: **demo sin backend**. Los datos viven en el `localStorage` del navegador. Ver `CONTEXTO.md` para el contexto del proyecto y los próximos pasos (base de datos, login real, avisos, pagos).

Hecho con [Lovable](https://lovable.dev) · React + TanStack Start + Vite + Tailwind + shadcn/ui.

## Desarrollo

```sh
npm install
npm run dev      # servidor de desarrollo (puerto 8080)
npm run build    # build de producción
npm run lint
npm test         # tests de la lógica de reservas (vitest)
```

Los datos del negocio (precios, capacidades, contacto) se editan en `src/lib/eventos.ts`.
Demo del chef: usuario `admin`, contraseña `admin`.

> Las librerías de TanStack (`react-start`, `react-router`, `router-plugin`) se actualizan siempre juntas.
