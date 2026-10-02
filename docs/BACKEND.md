# Plan del backend (multi-negocio)

Estado: **la app ya sabe hablar con Supabase.** Usa la base apenas existe el negocio en ella; mientras
no esté instalada, sigue en modo demostración (`localStorage`) y no se rompe nada.

## Instalar la base

**Base nueva:** en Supabase → **SQL Editor** → pegar todo `supabase/instalar_todo.sql` → **Run**
(si dice "La base ya está instalada", usar el archivo de actualización).

**Base que ya tenía las migraciones 0001 a 0003:** pegar `supabase/actualizar_multinegocio.sql` → Run.
Se puede correr más de una vez sin problema y conserva los pedidos existentes.

Después, para el chef:

1. **Authentication → Users → Add user → Create new user**: correo y contraseña, tildando **Auto Confirm User**.
2. SQL Editor: pegar `supabase/dar_acceso_al_chef.sql`, cambiar `CAMBIAR@correo.com` por ese correo → Run.
   Tiene que mostrar `chefs_con_acceso = 1`.

La URL y la clave pública ya están en `src/lib/config-supabase.ts` (se pueden pisar con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`). Nunca poner la clave `service_role` en el código.

## Varios restaurantes en la misma plataforma

Una sola aplicación y una sola base; cada restaurante es una "vista" distinta según la dirección web, y
**ninguno nota a los demás**:

| Capa          | Cómo se separa                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datos         | Todo cuelga de `negocio_id` con RLS. El público no puede leer `negocios`, `salones` ni `servicios`: solo llama a `obtener_negocio(slug)` y `negocio_por_dominio(host)`, que devuelven **un** negocio (nunca un listado). Cada chef lee y escribe únicamente su negocio.                                                                         |
| Dirección web | Tabla `dominios` (`reservas.anduma.com`, `anduma.tuplataforma.com`). La app lee el host y resuelve el negocio; un host desconocido muestra una página neutra "Página no encontrada". `?negocio=slug` solo funciona en `localhost` y `*.vercel.app`.                                                                                             |
| Marca         | `negocios` guarda `color_primario`, `color_acento`, `logo_url`, `favicon_url`, `foto_url`, `descripcion`. Los colores se aplican como variables CSS (`src/lib/marca.ts`); sin logo se muestran las iniciales. El título, la descripción y el ícono (y la vista previa de enlaces) salen **del servidor** según el host (`src/lib/cabecera.ts`). |
| Sesiones      | El chef solo entra si es miembro **del negocio de esa dirección** (no de cualquiera). La sesión de Supabase vive en el `localStorage` de cada origen, así que no se comparte entre direcciones.                                                                                                                                                 |
| Catálogo      | Salones, servicios y precios de cada negocio viven en la base y se editan ahí. Las constantes de `src/lib/eventos.ts` son solo el respaldo del modo demostración y la fuente de `seed.sql` del negocio principal.                                                                                                                               |

### Dar de alta un restaurante nuevo

1. **Authentication → Users**: crear el usuario del dueño (con Auto Confirm).
2. **Vercel → Project → Settings → Domains**: agregar su dirección. Un subdominio tuyo (para comodines
   `*.tuplataforma.com` Vercel pide usar sus nameservers) o el dominio del restaurante (CNAME a Vercel).
3. SQL Editor: abrir `supabase/nuevo_negocio.sql`, editar **solo** la sección marcada, y Run.
   Carga negocio, dominio, dueño, salones y servicios de ejemplo (editables luego en las tablas).

Probado en `supabase/tests/04_multinegocio.sql` (dos negocios y dos chefs, con intentos de lectura y escritura
cruzadas) y en el navegador con dos restaurantes simulados.

### Limitaciones conocidas de esta etapa

- Los fondos neutros (marrón cálido) son los mismos para todos; la marca cambia colores de acción, acento,
  logo, textos y fotos. Teñir también los fondos es posible pero queda para más adelante.
- Mails y Mercado Pago son **por instalación**, no por restaurante. El aviso por ntfy ya puede ser por restaurante
  (`NTFY_TOPICS`); mails y Mercado Pago requieren cuentas externas y Edge Functions (ver abajo).
- Sin logo propio se usan iniciales; para subir logos desde el panel habría que sumar Supabase Storage.

## Avisos al celular (ntfy), desde el servidor

El aviso de pedido nuevo lo envía **el servidor** (`src/lib/avisos-servidor.ts`), no el navegador:

- El tema de ntfy es una variable de entorno del **servidor** (`NTFY_TOPIC`, o el viejo `VITE_NTFY_TOPIC`, que sigue
  funcionando): nunca viaja al navegador, así nadie puede verlo ni mandar avisos falsos.
- Antes de avisar comprueba en la base que el pedido **exista** y siga pendiente, no repite avisos del mismo pedido y
  recorta todo lo recibido. Probado atacando el endpoint directamente.
- La notificación lleva el ícono del negocio (`public/icono-aviso.png`), los datos del pedido y dos botones
  (**Abrir panel** y **WhatsApp al cliente**).
- Por restaurante: `NTFY_TOPICS={"la-parrilla":"tema-secreto"}`. Un restaurante sin tema propio **no** avisa
  (nunca al del principal). Ver `.env.example`.

## Robustez

- **Panel del chef:** carga los pendientes y los últimos 90 días (no todo el historial); un pedido pendiente con fecha
  pasada se muestra como «Vencido» y no se puede aceptar; si la sesión se cierra (otra pestaña o vencimiento) vuelve
  solo a la pantalla de ingreso; se actualiza cada 15 segundos y al instante si la base tiene el tiempo real activo.
- **Monitoreo:** `/api/salud` devuelve 200 si la app y la base responden y 503 si la base no responde. Sirve para
  UptimeRobot (gratis) o para mirarlo a mano.
- **Migración opcional `0005_robustez.sql`** (la app funciona igual sin ella y la aprovecha sola al aplicarla): un doble
  envío no duplica el pedido, la lista de espera tiene validaciones y límites, los pedidos vencidos pasan a «cancelada»,
  el chef puede borrar entradas de su lista de espera y se activa el tiempo real.

## Cómo está conectado

- `src/lib/supabase.ts`: cliente, resolución del negocio por dirección web y detección del modo (base o demostración).
- `src/lib/config-negocio.ts`, `src/lib/marca.ts`, `src/lib/cabecera.ts`: datos del negocio, colores y encabezado.
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
- `supabase/migrations/0004_multinegocio.sql`: aislamiento entre negocios, dominios, marca y API pública por negocio.
- `supabase/migrations/0005_robustez.sql`: opcional (sin duplicados por doble envío, lista de espera con límites, vencidos, tiempo real).
- `supabase/seed.sql`: negocio y catálogo iniciales, generado con `npx vite-node scripts/generar-seed.ts`.
- `supabase/instalar_todo.sql` y `supabase/actualizar_multinegocio.sql`: lo anterior junto, para instalar de cero o
  para actualizar. `supabase/nuevo_negocio.sql` da de alta un restaurante.
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
3. **Avisos por mail y celular por negocio.** Edge Function que lea `avisos` sin enviar y los mande (Resend o similar).
   Mientras tanto, el celular del chef se avisa con ntfy desde el servidor (ver arriba y `.env.example`).
   WhatsApp automático requiere la API oficial (costo y aprobación); se mantienen los links `wa.me`.
4. **Seña con Mercado Pago.** Edge Function que crea la preferencia de pago y recibe el webhook para
   marcar `pagos.estado`. Necesita credenciales de Mercado Pago del negocio.
5. ~~Varios negocios por dirección web y catálogo en la base.~~ Hecho (ver arriba).
6. **Panel para que cada dueño edite su catálogo, precios y marca** (hoy se hace por SQL) y **onboarding** con cobro de suscripción.

## Pendientes de seguridad

- `crear_solicitud` es pública: ya tiene límites de frecuencia y de tamaño (migración 0003). Falta un captcha
  (por ejemplo Cloudflare Turnstile) antes de publicar a gran escala; `anotar_lista_espera` aún no tiene límites.
- Validar el formato de mail y teléfono también en la app.
- Guardar las claves secretas (Mercado Pago, mails) solo en secretos de las Edge Functions.

## Qué necesito de vos para seguir

- Cuando lleguemos a los avisos por mail: cuenta de Resend (o el servicio de mail que prefieras).
- Cuando lleguemos a la seña: credenciales de prueba de Mercado Pago.
