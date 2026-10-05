# Resto Demo

App de reservas de eventos para un restaurante (datos de demostración ficticios): bautismos, cumpleaños, casamientos y viandas. Dos vistas: **anfitrión** (pide una fecha) y **chef** (acepta o rechaza, con calendario por salón).

> Estado: **con base de datos (Supabase)**, login real del chef, pedidos compartidos entre dispositivos, varios restaurantes en la misma plataforma y avisos al celular. Si la base todavía no está instalada, funciona en modo demostración. Ver `docs/BACKEND.md`.

Hecho con [Lovable](https://lovable.dev) · React + TanStack Start + Vite + Tailwind + shadcn/ui.

## Correrlo en tu compu (Windows)

Doble clic en **`iniciar.bat`**: descarga la última versión, instala lo que falte, levanta el servidor y abre el navegador. (Necesita [Git](https://git-scm.com) y [Node.js](https://nodejs.org) instalados.)

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
