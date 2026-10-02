# Plan del backend (multi-negocio)

Estado: **diseñado y probado en un Postgres local, todavía sin conectar a ningún proyecto de Supabase.**
La app sigue funcionando con `localStorage` hasta que se haga la conexión.

## Qué hay hecho

- `supabase/migrations/0001_esquema_inicial.sql`: tablas, reglas de negocio y permisos (RLS).
- `supabase/tests/`: escenario de prueba reproducible (`00_mock_supabase.sql` + `01_escenario.sql`).

### Modelo

| Tabla | Para qué |
| --- | --- |
| `negocios` | Cada restaurante (tenant): slug, nombre, contacto, % de seña. |
| `miembros` | Qué usuario administra qué negocio (`dueno` / `staff`). |
| `salones`, `servicios` | Catálogo editable por negocio: capacidades, precios, recargos. |
| `solicitudes` | Pedidos de los anfitriones (con presupuesto calculado en el servidor). |
| `eventos` | Reservas confirmadas. Índice único: **un evento por salón y día**. |
| `lista_espera` | Interesados en una fecha ocupada. |
| `pagos` | Seña con Mercado Pago (pendiente, aprobado, rechazado, reintegrado). |
| `avisos` | Cola de mails/WhatsApp a enviar. |

### Reglas que ya hace la base (y no solo la pantalla)

- El anfitrión **no accede a las tablas**: usa `fechas_ocupadas`, `crear_solicitud` y `anotar_lista_espera`.
  Esas funciones validan capacidad, fecha pasada, salón ocupado y calculan el presupuesto.
- El chef acepta o rechaza con `responder_solicitud`: es atómica y no deja doble reserva aunque
  dos personas confirmen a la vez.
- Cada negocio ve solo lo suyo (RLS). Probado: otro negocio no ve ni responde solicitudes ajenas.
- Cada pedido y respuesta genera un registro en `avisos`.

## Qué falta, en orden

1. **Conectar Supabase.** Crear un proyecto en supabase.com, correr la migración (SQL Editor o
   `supabase db push`) y cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno.
   La clave anon es pública por diseño, pero igual va por variable de entorno, no en el repo.
2. **Cliente en la app.** `@supabase/supabase-js`; reemplazar `useDatos` (hoy `localStorage`) por
   llamadas a las funciones de arriba. El negocio se elige por URL (`/n/<slug>`).
3. **Login real del chef** con Supabase Auth (mail y contraseña) y eliminar `admin/admin` del código.
4. **Avisos.** Edge Function que lea `avisos` sin enviar y los mande por mail (Resend o similar).
   WhatsApp automático requiere la API oficial (costo y aprobación); al principio se mantienen los links `wa.me`.
5. **Seña con Mercado Pago.** Edge Function que crea la preferencia de pago y recibe el webhook para
   marcar `pagos.estado`. Necesita credenciales de Mercado Pago del negocio.
6. **Alta de negocios** (onboarding) y cobro de la suscripción.

## Pendientes de seguridad

- `crear_solicitud` es pública: poner límite de frecuencia y captcha antes de publicar.
- Validar el formato de mail y teléfono también en la app.
- Guardar las claves secretas (Mercado Pago, mails) solo en secretos de las Edge Functions.

## Qué necesito de vos para seguir

- URL y clave pública (anon) de un proyecto de Supabase propio.
- Cuenta de Resend (o el servicio de mail que prefieras) para los avisos.
- Cuando lleguemos a la seña: credenciales de prueba de Mercado Pago.
