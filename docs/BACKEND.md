# Plan del backend (multi-negocio)

Estado: **la app ya sabe hablar con Supabase.** Usa la base apenas existe el negocio en ella; mientras
no esté instalada, sigue en modo demostración (`localStorage`) y no se rompe nada.

## Instalar la base (una sola vez)

1. En Supabase → **SQL Editor** → New query: pegar todo `supabase/instalar_todo.sql` → **Run**.
   (Si dice "La base ya está instalada", ya estaba hecho.)
2. **Authentication → Users → Add user → Create new user**: correo y contraseña del chef,
   tildando **Auto Confirm User**.
3. SQL Editor: pegar `supabase/dar_acceso_al_chef.sql`, cambiar `CAMBIAR@correo.com` por ese correo → Run.
   Tiene que mostrar `chefs_con_acceso = 1`.

Listo: el chef entra con su correo y contraseña, y los pedidos de todos los clientes llegan al panel.
La URL y la clave pública ya están en `src/lib/supabase.ts` (se pueden pisar con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`). Nunca poner la clave `service_role` en el código.

## Cómo está conectado

- `src/lib/supabase.ts`: cliente y detección automática del modo (base o demostración).
- `src/lib/backend.ts`: lecturas y escrituras contra la base, con conversión a los tipos de la app.
- `src/lib/eventos.ts`: `useDatos("chef" | "anfitrion")` elige solo entre base y demostración.
- Anfitrión (sin cuenta): ve qué días están ocupados (`fechas_ocupadas`), envía pedidos (`crear_solicitud`)
  y ve el estado de los suyos (`estado_solicitudes`, con los ids guardados en su dispositivo).
- Chef: inicia sesión con Supabase Auth; ve todo su negocio (RLS) y responde con `responder_solicitud`.
- El panel se refresca cada 15 segundos y al volver a la pestaña.

## Qué hay hecho

- `supabase/migrations/0001_esquema_inicial.sql`: tablas, reglas de negocio y permisos (RLS).
- `supabase/migrations/0002_estado_solicitudes.sql`: estado de pedidos para el anfitrión, lectura pública
  limitada por columnas (el mail de avisos no es público) y arreglo del permiso de `es_miembro`.
- `supabase/migrations/0003_limites_anti_spam.sql`: límites en `crear_solicitud` (3 pedidos por hora y 5 pendientes
  por teléfono, 40 por hora en todo el negocio, largo máximo de nombre y comentario, fechas razonables).
- `supabase/seed.sql`: negocio y catálogo iniciales, generado con `npx vite-node scripts/generar-seed.ts`.
- `supabase/instalar_todo.sql`: todo lo anterior junto, para instalar de cero. Si la base ya estaba instalada,
  se pegan solo las migraciones nuevas (por ejemplo `0003`).
- `supabase/tests/`: pruebas reproducibles (`00_mock_supabase.sql`, `01_escenario.sql`, `02_catalogo_y_estado.sql`).

### Modelo

| Tabla                  | Para qué                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `negocios`             | Cada restaurante (tenant): slug, nombre, contacto, % de seña.          |
| `miembros`             | Qué usuario administra qué negocio (`dueno` / `staff`).                |
| `salones`, `servicios` | Catálogo editable por negocio: capacidades, precios, recargos.         |
| `solicitudes`          | Pedidos de los anfitriones (con presupuesto calculado en el servidor). |
| `eventos`              | Reservas confirmadas. Índice único: **un evento por salón y día**.     |
| `lista_espera`         | Interesados en una fecha ocupada.                                      |
| `pagos`                | Seña con Mercado Pago (pendiente, aprobado, rechazado, reintegrado).   |
| `avisos`               | Cola de mails/WhatsApp a enviar.                                       |

### Reglas que ya hace la base (y no solo la pantalla)

- El anfitrión **no accede a las tablas**: usa `fechas_ocupadas`, `crear_solicitud` y `anotar_lista_espera`.
  Esas funciones validan capacidad, fecha pasada, salón ocupado y calculan el presupuesto.
- El chef acepta o rechaza con `responder_solicitud`: es atómica y no deja doble reserva aunque
  dos personas confirmen a la vez.
- Cada negocio ve solo lo suyo (RLS). Probado: otro negocio no ve ni responde solicitudes ajenas.
- Cada pedido y respuesta genera un registro en `avisos`.

## Qué falta, en orden

1. ~~Conectar Supabase y cliente en la app.~~ Hecho (falta instalar la base, ver arriba).
2. ~~Login real del chef.~~ Hecho: con la base instalada ya no sirve `admin/admin`.
3. **Avisos por mail.** Edge Function que lea `avisos` sin enviar y los mande (Resend o similar).
   Mientras tanto, el celular del chef se avisa con ntfy (`VITE_NTFY_TOPIC`, ver `.env.example`).
   WhatsApp automático requiere la API oficial (costo y aprobación); se mantienen los links `wa.me`.
4. **Seña con Mercado Pago.** Edge Function que crea la preferencia de pago y recibe el webhook para
   marcar `pagos.estado`. Necesita credenciales de Mercado Pago del negocio.
5. **Varios negocios por URL** (`/n/<slug>`) y catálogo editable desde la base (hoy el catálogo vive
   en `src/lib/eventos.ts` y se copia a la base con `seed.sql`).
6. **Alta de negocios** (onboarding) y cobro de la suscripción.

## Pendientes de seguridad

- `crear_solicitud` es pública: ya tiene límites de frecuencia y de tamaño (migración 0003). Falta un captcha
  (por ejemplo Cloudflare Turnstile) antes de publicar a gran escala; `anotar_lista_espera` aún no tiene límites.
- Validar el formato de mail y teléfono también en la app.
- Guardar las claves secretas (Mercado Pago, mails) solo en secretos de las Edge Functions.

## Qué necesito de vos para seguir

- Cuando lleguemos a los avisos por mail: cuenta de Resend (o el servicio de mail que prefieras).
- Cuando lleguemos a la seña: credenciales de prueba de Mercado Pago.
