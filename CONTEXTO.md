# Contexto del proyecto: Anduma Resto (app de reservas de eventos)

> Pegá este archivo al empezar un chat nuevo para que Claude retome sin repetir todo.
> Última actualización: 1 de octubre de 2026.

## Quién soy y cómo quiero que me ayudes

- Me llamo Gaspar. Estoy aprendiendo a diseñar páginas web y apps.
- Quiero que actúes como **business developer experto y asesor**: ideas que resuelvan un problema real y generen dinero a mediano y largo plazo.
- Hablame en español (rioplatense), directo y sin vueltas. Si algo falla, quiero pasos cortos y de a uno, no explicaciones largas.
- Trabajo en Windows (PC "kernelos-pc"). Uso PowerShell.

## El proyecto

Una app de **reservas de eventos para Anduma Resto**, el restaurante de un chef de mi pueblo (Villa del Rosario, Córdoba). El objetivo es mostrársela algún día como demostración y, más adelante, convertirla en un producto con suscripción.

- **Cliente objetivo:** el chef (Instagram del chef: @marianorossa.chef).
- **Cómo reservan hoy:** por WhatsApp.
- **Qué ofrecen:** bautismos, cumpleaños, casamientos y viandas. Antes hacían comida al campo; ahora hacen cocina de eventos a pedido del organizador.
- **Salones:** salón de eventos (capacidad 160) y salón restó (capacidad **60, a confirmar: puede ser 80**).
- **Precios:** no los tengo, todo figura como "A consultar".
- **Contacto:** Salta 877, Villa del Rosario, Córdoba 5963. WhatsApp del chef 3573 46-8600  y mail por confirmar (en la demo se usan temporalmente los de Gaspar, 3573 44-3038 y fernandezgaspar13@gmail.com, para probar). Instagram: @andumagastronomia (restaurante) y @andumaeventos (eventos).
- **Horarios (de la bio de Instagram, a confirmar):** viandas y almuerzos todos los días, cenas de miércoles a sábado.
- **Marca:** logo con una "A" en letra cursiva color crema sobre fondo marrón con textura de cuero. Paleta: cacao oscuro, cuero (#7a3b21 / #a9522b), crema (#f1e6d0) y latón apagado (#d1a35f). Tema oscuro por defecto. Tipografías: Young Serif (títulos) y Figtree (texto).

## Cómo funciona la app

Dos roles, sin backend todavía:

1. **Anfitrión (cliente):** deja nombre y WhatsApp, elige servicio, salón, día libre, cantidad de personas, horario y opciones de menú (celíaco, vegano, etc.). Envía el pedido y puede avisar por WhatsApp.
2. **Chef (restaurante):** usuario y contraseña de la demo: `admin` / `admin`. Ve el calendario con eventos por salón, agenda eventos, acepta o rechaza pedidos (no deja aceptar si el salón ya está ocupado ese día) y puede escribirle al cliente por WhatsApp. Tiene un botón "Cargar datos de ejemplo" para reiniciar la demo.

Reglas de negocio: cada salón admite un evento por día; las viandas no ocupan salón (máximo 300 por pedido, a confirmar).

## Stack técnico

- Proyecto creado con **Lovable** (React + TanStack Start + Vite + Tailwind + shadcn/ui). Repo en GitHub: `Gasparff/anduma-resto` (privado). `master` es el respaldo de la demo v1.
- Carpeta de trabajo en mi PC: `C:\Users\Administrator\Desktop\AndumaResto`. Puerto de desarrollo: 8080 (`npm run dev -- --host`).
- Archivos clave en `src/`:
  - `lib/eventos.ts`: datos del negocio, servicios, salones, lógica de reservas y datos de ejemplo. **Acá se cambian precios, capacidades y contacto.**
  - `components/Login.tsx` (portada), `VistaAnfitrion.tsx`, `VistaChef.tsx`, `Calendario.tsx`, `FlipCards.tsx`, `PieContacto.tsx`, `Encabezado.tsx`.
  - `styles.css`: colores y tipografías.
- **Los datos se guardan en el `localStorage` del navegador**: cada dispositivo ve solo sus propios datos. Es una demo, no un producto real todavía.

## Estado actual (qué está hecho)

- Marca de Anduma Resto aplicada, dos salones, cuatro servicios, calendario por salón, WhatsApp integrado, pie con contacto, modo claro y oscuro, versión para celular. Verificado con capturas en celular y escritorio.
- Código corregido: compila sin errores de tipos.
- Proyecto de Vercel creado: `anduma-resto` (cuenta `fernandezgaspar13-4367s-projects`), framework `tanstack-start-lovable`.

## Lo que pasó con la publicación en Vercel (para no repetirlo)

1. Los primeros intentos fallaron porque `@tanstack/react-start` se había subido a `^1.168.60` sin actualizar `react-router`, y el build daba `MISSING_EXPORT "_getRenderedMatches"`.
2. Al volver a la versión vieja (`1.168.32`), Vercel la **bloqueó por una falla de seguridad** (error `BLOCKED_PACKAGE`, aviso GHSA-qx66-fv34-fjm8).
3. **Solución aplicada:** actualizar las tres juntas: `@tanstack/react-start ^1.168.60`, `@tanstack/react-router ^1.170.41`, `@tanstack/router-plugin ^1.168.42`. También se ajustó el tipo de `errorComponent` en `src/routes/__root.tsx`. En mi entorno compila y la página abre bien.
4. **Pendiente de confirmar:** que el publicado en Vercel termine en estado READY.

Pasos para publicar (en PowerShell, dentro de `AndumaResto`, uno por vez):

```
Remove-Item -Recurse -Force node_modules, package-lock.json, .output
npm install
npm run build
npx vercel --prod
```

Después, en el panel de Vercel: Settings, Deployment Protection, "Disabled", para que el chef pueda abrir el link sin iniciar sesión.

## Qué puede y qué no puede hacer Claude en este entorno

- Puede leer y escribir archivos en la carpeta `AndumaResto` de mi PC, compilar y probar la app en su propio entorno, y consultar el estado de Vercel.
- **No puede ejecutar comandos en mi PC** (la terminal de Windows solo permite clics) ni abrir `localhost` o la red local desde su navegador. Esos comandos los corro yo.
- No puede leer los registros de compilación de Vercel (da error de permisos). Para ver errores, uso `npm run build > build.log 2>&1` y Claude lee el archivo directo de la carpeta.
- No debe actualizar librerías sueltas: las de TanStack se actualizan siempre juntas.

## Pendientes y próximos pasos

1. Publicar en Vercel y desactivar la protección del link.
2. Confirmar con el chef: capacidad real del salón restó (60 u 80), precios, horarios y número de WhatsApp.
3. Pedir el logo en alta resolución (el actual salió de una captura de Instagram) y reemplazar `public/logo.png`.
4. **Conectar una base de datos** (por ejemplo Supabase) y un login real, para que chef y clientes vean los mismos datos desde distintos dispositivos. Es el paso que lo convierte en producto.
5. Avisos por mail o WhatsApp automáticos cuando llegue o se responda un pedido.
6. Cobro: suscripción mensual baja o comisión por reserva confirmada. Más adelante, perfil propio por chef para venderlo a varios restaurantes.

## Ideas de negocio que ya charlamos

Esta app es la idea #1 de la lista: sistema de reservas y recordatorios para negocios chicos, con suscripción mensual (US$10 a 25). Otras ideas descartadas por ahora: webs con mantenimiento mensual para pymes, catálogo con pedidos por WhatsApp, herramienta para freelancers y directorio de oficios locales.

## Nota (2 de octubre de 2026): la rama de trabajo usa datos ficticios

En `claude/gifted-dirac-txlmgb` la app ya no tiene datos reales de Anduma: nombre "Resto Demo", dirección, Instagram, horarios y logo son ficticios. Solo el WhatsApp (3573 44-3038) y el mail (fernandezgaspar13@gmail.com) son de Gaspar, para probar. `master` conserva la versión con los datos reales de Anduma.
