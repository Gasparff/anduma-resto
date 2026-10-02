-- =============================================================================
--  INSTALACIÓN COMPLETA DE LA BASE (pegar UNA sola vez en Supabase → SQL Editor → Run)
--  Contiene, en orden: migrations/0001 + 0002 + 0003 + 0004 + seed.sql
--  Generado a partir de esos archivos: no editar a mano.
--  Si ya instalaste antes, NO uses este archivo: usá actualizar_multinegocio.sql
-- =============================================================================

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'negocios') then
    raise exception 'La base ya está instalada. Si querés actualizarla, usá actualizar_multinegocio.sql.';
  end if;
end $$;

-- ===== supabase/migrations/0001_esquema_inicial.sql =====
-- Esquema inicial multi-negocio para la app de reservas de eventos.
-- Pensado para Supabase (Postgres + Auth + RLS). Todavía NO está aplicado a ninguna base:
-- se corre cuando se conecte el proyecto de Supabase (ver docs/BACKEND.md).
--
-- Idea central: cada restaurante es un "negocio" (tenant). Todo lo demás cuelga de un negocio,
-- y las políticas RLS garantizan que cada dueño solo ve y toca lo suyo.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type rol_miembro as enum ('dueno', 'staff');
create type estado_solicitud as enum ('pendiente', 'confirmada', 'rechazada', 'cancelada');
create type estado_pago as enum ('pendiente', 'aprobado', 'rechazado', 'reintegrado');
create type tipo_unidad as enum ('personas', 'viandas');

-- ---------------------------------------------------------------------------
-- Negocios y miembros
-- ---------------------------------------------------------------------------
create table negocios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null,
  direccion text,
  whatsapp text,                    -- formato wa.me, ej. 5493573443038
  email_avisos text,                -- adonde llegan los avisos de pedidos nuevos
  instagram text[] not null default '{}',
  horarios text[] not null default '{}',
  logo_url text,
  porcentaje_sena numeric(5,2) not null default 30 check (porcentaje_sena between 0 and 100),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table miembros (
  negocio_id uuid not null references negocios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  rol rol_miembro not null default 'dueno',
  creado_en timestamptz not null default now(),
  primary key (negocio_id, usuario_id)
);
create index miembros_usuario_idx on miembros (usuario_id);

-- ---------------------------------------------------------------------------
-- Catálogo: salones y servicios
-- ---------------------------------------------------------------------------
create table salones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  codigo text not null,             -- 'eventos', 'resto'
  nombre text not null,
  capacidad integer not null check (capacidad > 0),
  descripcion text,
  recargo numeric(12,2) not null default 0 check (recargo >= 0),
  activo boolean not null default true,
  unique (negocio_id, codigo)
);

create table servicios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  codigo text not null,             -- 'bautismos', 'cumpleanos', ...
  nombre text not null,
  singular text not null,
  resumen text,
  descripcion text,
  incluye text[] not null default '{}',
  precio_unitario numeric(12,2) not null default 0 check (precio_unitario >= 0),
  unidad tipo_unidad not null default 'personas',
  usa_salon boolean not null default true,
  hora_sugerida time,
  max_por_pedido integer check (max_por_pedido is null or max_por_pedido > 0),
  orden integer not null default 0,
  activo boolean not null default true,
  unique (negocio_id, codigo)
);

-- ---------------------------------------------------------------------------
-- Solicitudes y eventos
-- ---------------------------------------------------------------------------
create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  servicio_id uuid not null references servicios(id),
  salon_id uuid references salones(id),
  anfitrion text not null check (length(trim(anfitrion)) > 0),
  telefono text not null check (length(regexp_replace(telefono, '\D', '', 'g')) >= 8),
  email text,
  fecha date not null,
  hora time not null,
  personas integer not null check (personas > 0),
  comentario text not null default '',
  dietas text[] not null default '{}',
  presupuesto numeric(12,2),
  estado estado_solicitud not null default 'pendiente',
  respondida_en timestamptz,
  creada_en timestamptz not null default now()
);
create index solicitudes_negocio_estado_idx on solicitudes (negocio_id, estado, fecha);

-- Un evento confirmado por día y salón (regla del negocio). Las viandas no usan salón.
create table eventos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  solicitud_id uuid unique references solicitudes(id) on delete set null,
  servicio_id uuid not null references servicios(id),
  salon_id uuid references salones(id),
  nombre text not null,
  anfitrion text,
  fecha date not null,
  hora time not null,
  personas integer not null check (personas > 0),
  creado_en timestamptz not null default now()
);
create unique index eventos_un_evento_por_dia_y_salon
  on eventos (salon_id, fecha) where salon_id is not null;
create index eventos_negocio_fecha_idx on eventos (negocio_id, fecha);

-- Quien quiere una fecha ocupada deja sus datos y el chef lo ve.
create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  salon_id uuid references salones(id),
  fecha date not null,
  nombre text not null,
  telefono text not null,
  personas integer check (personas is null or personas > 0),
  creada_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pagos (seña con Mercado Pago) y avisos
-- ---------------------------------------------------------------------------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  solicitud_id uuid not null references solicitudes(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  estado estado_pago not null default 'pendiente',
  proveedor text not null default 'mercadopago',
  referencia_externa text,          -- id de preferencia o de pago en Mercado Pago
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table avisos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  solicitud_id uuid references solicitudes(id) on delete cascade,
  canal text not null check (canal in ('email', 'whatsapp')),
  destinatario text not null,
  asunto text,
  mensaje text not null,
  enviado_en timestamptz,
  error text,
  creado_en timestamptz not null default now()
);
create index avisos_pendientes_idx on avisos (creado_en) where enviado_en is null;

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de seguridad
-- ---------------------------------------------------------------------------
create or replace function es_miembro(p_negocio uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from miembros m
    where m.negocio_id = p_negocio and m.usuario_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Funciones públicas (las usa el anfitrión sin iniciar sesión)
-- ---------------------------------------------------------------------------

-- Fechas ocupadas de un negocio: solo día y salón, nunca datos del cliente.
create or replace function fechas_ocupadas(p_slug text, p_desde date default current_date)
returns table (fecha date, salon_codigo text)
language sql stable security definer set search_path = public
as $$
  select e.fecha, s.codigo
  from eventos e
  join negocios n on n.id = e.negocio_id
  join salones s on s.id = e.salon_id
  where n.slug = p_slug and n.activo and e.fecha >= p_desde;
$$;

-- Crea un pedido validando cupo, fecha, capacidad y salón libre. Devuelve el id de la solicitud.
create or replace function crear_solicitud(
  p_slug text,
  p_servicio text,
  p_salon text,
  p_anfitrion text,
  p_telefono text,
  p_email text,
  p_fecha date,
  p_hora time,
  p_personas integer,
  p_comentario text default '',
  p_dietas text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_negocio negocios%rowtype;
  v_servicio servicios%rowtype;
  v_salon salones%rowtype;
  v_max integer;
  v_presupuesto numeric(12,2);
  v_id uuid;
begin
  select * into v_negocio from negocios where slug = p_slug and activo;
  if not found then raise exception 'Negocio no encontrado'; end if;

  select * into v_servicio from servicios
   where negocio_id = v_negocio.id and codigo = p_servicio and activo;
  if not found then raise exception 'Servicio no encontrado'; end if;

  if p_fecha < current_date then raise exception 'No se pueden pedir días pasados'; end if;
  if p_personas is null or p_personas < 1 then raise exception 'Cantidad inválida'; end if;

  if v_servicio.usa_salon then
    select * into v_salon from salones
     where negocio_id = v_negocio.id and codigo = p_salon and activo;
    if not found then raise exception 'Salón no encontrado'; end if;
    v_max := v_salon.capacidad;
    if exists (select 1 from eventos where salon_id = v_salon.id and fecha = p_fecha) then
      raise exception 'Ese salón ya está ocupado ese día';
    end if;
  else
    v_max := coalesce(v_servicio.max_por_pedido, 300);
  end if;

  if p_personas > v_max then
    raise exception 'La cantidad supera el máximo permitido (%)', v_max;
  end if;

  v_presupuesto := v_servicio.precio_unitario * p_personas
                   + case when v_servicio.usa_salon then v_salon.recargo else 0 end;

  insert into solicitudes (negocio_id, servicio_id, salon_id, anfitrion, telefono, email,
                           fecha, hora, personas, comentario, dietas, presupuesto)
  values (v_negocio.id, v_servicio.id, case when v_servicio.usa_salon then v_salon.id end,
          trim(p_anfitrion), p_telefono, nullif(trim(p_email), ''), p_fecha, p_hora,
          p_personas, coalesce(p_comentario, ''), coalesce(p_dietas, '{}'), v_presupuesto)
  returning id into v_id;

  -- Aviso al chef: lo recoge la Edge Function que envía mails (ver docs/BACKEND.md).
  if v_negocio.email_avisos is not null then
    insert into avisos (negocio_id, solicitud_id, canal, destinatario, asunto, mensaje)
    values (v_negocio.id, v_id, 'email', v_negocio.email_avisos,
            'Nuevo pedido de ' || trim(p_anfitrion),
            trim(p_anfitrion) || ' pidió ' || v_servicio.singular || ' para el ' ||
            to_char(p_fecha, 'DD/MM/YYYY') || ' (' || p_personas || ' ' ||
            v_servicio.unidad || ').');
  end if;

  return v_id;
end;
$$;

-- Lista de espera pública para una fecha ocupada.
create or replace function anotar_lista_espera(
  p_slug text, p_salon text, p_fecha date, p_nombre text, p_telefono text, p_personas integer
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_negocio uuid;
  v_salon uuid;
  v_id uuid;
begin
  select id into v_negocio from negocios where slug = p_slug and activo;
  if v_negocio is null then raise exception 'Negocio no encontrado'; end if;
  select id into v_salon from salones where negocio_id = v_negocio and codigo = p_salon;
  insert into lista_espera (negocio_id, salon_id, fecha, nombre, telefono, personas)
  values (v_negocio, v_salon, p_fecha, trim(p_nombre), p_telefono, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Función del chef: responder una solicitud de forma atómica
-- ---------------------------------------------------------------------------
create or replace function responder_solicitud(p_solicitud uuid, p_estado estado_solicitud)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sol solicitudes%rowtype;
  v_servicio servicios%rowtype;
begin
  select * into v_sol from solicitudes where id = p_solicitud for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if not es_miembro(v_sol.negocio_id) then raise exception 'Sin permiso'; end if;
  if v_sol.estado <> 'pendiente' then raise exception 'La solicitud ya fue respondida'; end if;
  if p_estado = 'pendiente' then raise exception 'Estado inválido'; end if;

  select * into v_servicio from servicios where id = v_sol.servicio_id;

  if p_estado = 'confirmada' then
    -- El índice único eventos_un_evento_por_dia_y_salon evita dobles reservas aunque haya carreras.
    begin
      insert into eventos (negocio_id, solicitud_id, servicio_id, salon_id, nombre, anfitrion,
                           fecha, hora, personas)
      values (v_sol.negocio_id, v_sol.id, v_sol.servicio_id, v_sol.salon_id,
              v_servicio.singular || ' de ' || v_sol.anfitrion, v_sol.anfitrion,
              v_sol.fecha, v_sol.hora, v_sol.personas);
    exception when unique_violation then
      raise exception 'Ese salón ya tiene un evento ese día';
    end;
  end if;

  update solicitudes set estado = p_estado, respondida_en = now() where id = p_solicitud;

  if v_sol.email is not null then
    insert into avisos (negocio_id, solicitud_id, canal, destinatario, asunto, mensaje)
    values (v_sol.negocio_id, v_sol.id, 'email', v_sol.email,
            case when p_estado = 'confirmada' then 'Tu reserva fue confirmada'
                 else 'Sobre tu pedido' end,
            case when p_estado = 'confirmada'
                 then 'Confirmamos tu ' || v_servicio.singular || ' para el ' ||
                      to_char(v_sol.fecha, 'DD/MM/YYYY') || '.'
                 else 'Lamentablemente no podemos tomar tu pedido para esa fecha.' end);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: por defecto nada; solo se abre lo necesario
-- ---------------------------------------------------------------------------
alter table negocios enable row level security;
alter table miembros enable row level security;
alter table salones enable row level security;
alter table servicios enable row level security;
alter table solicitudes enable row level security;
alter table eventos enable row level security;
alter table lista_espera enable row level security;
alter table pagos enable row level security;
alter table avisos enable row level security;

-- Catálogo público (lectura): lo ve cualquiera para mostrar precios, salones y servicios.
create policy negocios_lectura_publica on negocios for select using (activo);
create policy salones_lectura_publica on salones for select using (activo);
create policy servicios_lectura_publica on servicios for select using (activo);

-- Miembros: cada uno ve sus propias membresías.
create policy miembros_propios on miembros for select using (usuario_id = auth.uid());

-- Dueños y staff administran su negocio.
create policy negocios_admin on negocios for update using (es_miembro(id)) with check (es_miembro(id));
create policy salones_admin on salones for all using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy servicios_admin on servicios for all using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy solicitudes_admin on solicitudes for select using (es_miembro(negocio_id));
create policy eventos_admin on eventos for all using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));
create policy lista_espera_admin on lista_espera for select using (es_miembro(negocio_id));
create policy pagos_admin on pagos for select using (es_miembro(negocio_id));
create policy avisos_admin on avisos for select using (es_miembro(negocio_id));

-- Los anfitriones no tienen acceso directo a las tablas con datos de clientes:
-- solo pasan por las funciones fechas_ocupadas, crear_solicitud y anotar_lista_espera.
revoke all on all tables in schema public from anon, authenticated;
grant select on negocios, salones, servicios to anon, authenticated;
grant select on miembros, solicitudes, eventos, lista_espera, pagos, avisos to authenticated;
grant update on negocios to authenticated;
grant insert, update, delete on salones, servicios, eventos to authenticated;

revoke all on function crear_solicitud, fechas_ocupadas, anotar_lista_espera,
  responder_solicitud, es_miembro from public;
grant execute on function fechas_ocupadas, crear_solicitud, anotar_lista_espera to anon, authenticated;
grant execute on function responder_solicitud, es_miembro to authenticated;

-- ===== supabase/migrations/0002_estado_solicitudes.sql =====
-- Permite al anfitrión (sin cuenta) ver cómo van SUS pedidos.
-- No hay forma de listar pedidos ajenos: hay que conocer el id de cada solicitud (uuid aleatorio),
-- que solo recibe quien la creó. Devuelve únicamente el estado, nunca datos del cliente.
create or replace function estado_solicitudes(p_ids uuid[])
returns table (id uuid, estado estado_solicitud)
language sql stable security definer set search_path = public
as $$
  select s.id, s.estado
  from solicitudes s
  where s.id = any(p_ids)
  limit 200;
$$;

revoke all on function estado_solicitudes(uuid[]) from public;
grant execute on function estado_solicitudes(uuid[]) to anon, authenticated;

-- Endurecimiento: el público solo puede leer los datos de presentación del negocio,
-- no el mail donde llegan los avisos ni el porcentaje de seña. Los dueños siguen viendo todo.
revoke select on negocios from anon;
grant select (id, slug, nombre, direccion, whatsapp, instagram, horarios, logo_url, activo)
  on negocios to anon;

-- Arreglo: las políticas de salones y servicios consultan es_miembro() también para el público;
-- sin este permiso, leer el catálogo sin iniciar sesión falla. Para anónimos devuelve false.
grant execute on function es_miembro(uuid) to anon;

-- En Supabase las funciones nuevas nacen ejecutables por el público; las del chef se cierran explícito.
revoke execute on function responder_solicitud(uuid, estado_solicitud) from anon;

-- ===== supabase/migrations/0003_limites_anti_spam.sql =====
-- Anti-spam de crear_solicitud (función pública): límites de tamaño y de frecuencia.
-- Reemplaza la función de 0001 (mismos parámetros y permisos) agregando los límites marcados.
-- Los límites viven en la base, así que no se pueden saltear desde el navegador.

create index if not exists solicitudes_negocio_creada_idx on solicitudes (negocio_id, creada_en);

create or replace function crear_solicitud(
  p_slug text,
  p_servicio text,
  p_salon text,
  p_anfitrion text,
  p_telefono text,
  p_email text,
  p_fecha date,
  p_hora time,
  p_personas integer,
  p_comentario text default '',
  p_dietas text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_negocio negocios%rowtype;
  v_servicio servicios%rowtype;
  v_salon salones%rowtype;
  v_max integer;
  v_presupuesto numeric(12,2);
  v_id uuid;
  v_tel text;
begin
  select * into v_negocio from negocios where slug = p_slug and activo;
  if not found then raise exception 'Negocio no encontrado'; end if;

  -- Límites contra abuso (la función es pública): tamaños razonables y frecuencia por teléfono.
  if length(trim(coalesce(p_anfitrion, ''))) = 0 or length(p_anfitrion) > 80 then
    raise exception 'Escribí tu nombre (hasta 80 caracteres)';
  end if;
  if length(coalesce(p_comentario, '')) > 1000 then
    raise exception 'El comentario es demasiado largo (máximo 1000 caracteres)';
  end if;
  if coalesce(array_length(p_dietas, 1), 0) > 10 then
    raise exception 'Demasiadas opciones de menú';
  end if;
  if p_fecha > current_date + 730 then
    raise exception 'La fecha elegida está demasiado lejos';
  end if;

  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if (select count(*) from solicitudes
       where negocio_id = v_negocio.id and creada_en > now() - interval '1 hour'
         and regexp_replace(telefono, '\D', '', 'g') = v_tel) >= 3 then
    raise exception 'Hiciste varios pedidos seguidos. Esperá un rato o escribinos por WhatsApp.';
  end if;
  if (select count(*) from solicitudes
       where negocio_id = v_negocio.id and estado = 'pendiente'
         and regexp_replace(telefono, '\D', '', 'g') = v_tel) >= 5 then
    raise exception 'Ya tenés varios pedidos pendientes. Esperá a que el restaurante responda.';
  end if;
  if (select count(*) from solicitudes
       where negocio_id = v_negocio.id and creada_en > now() - interval '1 hour') >= 40 then
    raise exception 'Estamos recibiendo muchos pedidos en este momento. Probá de nuevo en un rato.';
  end if;

  select * into v_servicio from servicios
   where negocio_id = v_negocio.id and codigo = p_servicio and activo;
  if not found then raise exception 'Servicio no encontrado'; end if;

  if p_fecha < current_date then raise exception 'No se pueden pedir días pasados'; end if;
  if p_personas is null or p_personas < 1 then raise exception 'Cantidad inválida'; end if;

  if v_servicio.usa_salon then
    select * into v_salon from salones
     where negocio_id = v_negocio.id and codigo = p_salon and activo;
    if not found then raise exception 'Salón no encontrado'; end if;
    v_max := v_salon.capacidad;
    if exists (select 1 from eventos where salon_id = v_salon.id and fecha = p_fecha) then
      raise exception 'Ese salón ya está ocupado ese día';
    end if;
  else
    v_max := coalesce(v_servicio.max_por_pedido, 300);
  end if;

  if p_personas > v_max then
    raise exception 'La cantidad supera el máximo permitido (%)', v_max;
  end if;

  v_presupuesto := v_servicio.precio_unitario * p_personas
                   + case when v_servicio.usa_salon then v_salon.recargo else 0 end;

  insert into solicitudes (negocio_id, servicio_id, salon_id, anfitrion, telefono, email,
                           fecha, hora, personas, comentario, dietas, presupuesto)
  values (v_negocio.id, v_servicio.id, case when v_servicio.usa_salon then v_salon.id end,
          trim(p_anfitrion), p_telefono, nullif(trim(p_email), ''), p_fecha, p_hora,
          p_personas, coalesce(p_comentario, ''), coalesce(p_dietas, '{}'), v_presupuesto)
  returning id into v_id;

  -- Aviso al chef: lo recoge la Edge Function que envía mails (ver docs/BACKEND.md).
  if v_negocio.email_avisos is not null then
    insert into avisos (negocio_id, solicitud_id, canal, destinatario, asunto, mensaje)
    values (v_negocio.id, v_id, 'email', v_negocio.email_avisos,
            'Nuevo pedido de ' || trim(p_anfitrion),
            trim(p_anfitrion) || ' pidió ' || v_servicio.singular || ' para el ' ||
            to_char(p_fecha, 'DD/MM/YYYY') || ' (' || p_personas || ' ' ||
            v_servicio.unidad || ').');
  end if;

  return v_id;
end;
$$;

-- ===== supabase/migrations/0004_multinegocio.sql =====
-- Multi-negocio de verdad: cada restaurante es una "vista" distinta de la misma plataforma y
-- ninguno puede ver ni descubrir a los otros.
--
--  1. Se cierra la lectura pública de negocios, salones y servicios: antes cualquiera con la clave
--     pública podía listar todos los restaurantes. Ahora el público solo llama a funciones que
--     devuelven UN negocio a partir de su slug o de su dominio.
--  2. Cada chef lee únicamente su propio negocio (antes veía los datos básicos de todos).
--  3. Dominios: el negocio se resuelve por la dirección web (anduma.plataforma.com o un dominio propio).
--  4. Marca por negocio: colores, favicon y datos de contacto públicos.

-- ---------------------------------------------------------------------------
-- Marca y contacto público
-- ---------------------------------------------------------------------------
alter table negocios
  add column if not exists color_primario text check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists color_acento text check (color_acento ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists favicon_url text,
  add column if not exists foto_url text,            -- foto de fondo de la pantalla de ingreso
  add column if not exists descripcion text,
  add column if not exists email_contacto text,      -- el que se muestra al público (email_avisos es privado)
  add column if not exists whatsapp_visible text;    -- cómo se muestra el número, ej. 3573 44-3038

-- ---------------------------------------------------------------------------
-- Dominios
-- ---------------------------------------------------------------------------
create table if not exists dominios (
  dominio text primary key check (dominio = lower(dominio) and dominio !~ '\s'),
  negocio_id uuid not null references negocios(id) on delete cascade,
  creado_en timestamptz not null default now()
);
create index if not exists dominios_negocio_idx on dominios (negocio_id);

alter table dominios enable row level security;
revoke all on dominios from anon, authenticated;
grant select on dominios to authenticated;
drop policy if exists dominios_miembros on dominios;
create policy dominios_miembros on dominios for select using (es_miembro(negocio_id));

-- ---------------------------------------------------------------------------
-- Cierre de la lectura pública y aislamiento entre chefs
-- ---------------------------------------------------------------------------
drop policy if exists negocios_lectura_publica on negocios;
drop policy if exists salones_lectura_publica on salones;
drop policy if exists servicios_lectura_publica on servicios;

-- Un chef lee solo los negocios que administra. (salones y servicios ya tienen sus políticas de miembro.)
drop policy if exists negocios_miembros_lectura on negocios;
create policy negocios_miembros_lectura on negocios for select using (es_miembro(id));

revoke all on negocios, salones, servicios from anon;
grant select on negocios, salones, servicios to authenticated;

-- ---------------------------------------------------------------------------
-- API pública: un negocio por vez, nunca un listado
-- ---------------------------------------------------------------------------

-- Dado el host (ej. reservas.anduma.com), devuelve el slug del negocio o null.
create or replace function negocio_por_dominio(p_dominio text)
returns text
language sql stable security definer set search_path = public
as $$
  select n.slug
  from dominios d
  join negocios n on n.id = d.negocio_id
  where d.dominio = lower(trim(p_dominio)) and n.activo;
$$;

-- Todo lo que necesita la pantalla pública de UN negocio: datos de presentación, salones y servicios.
-- No expone el mail de avisos ni el porcentaje de seña.
create or replace function obtener_negocio(p_slug text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'negocio', jsonb_build_object(
      'slug', n.slug, 'nombre', n.nombre, 'direccion', n.direccion,
      'whatsapp', n.whatsapp, 'whatsapp_visible', n.whatsapp_visible,
      'email_contacto', n.email_contacto, 'instagram', n.instagram, 'horarios', n.horarios,
      'descripcion', n.descripcion, 'logo_url', n.logo_url, 'favicon_url', n.favicon_url,
      'foto_url', n.foto_url,
      'color_primario', n.color_primario, 'color_acento', n.color_acento),
    'salones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', s.codigo, 'nombre', s.nombre, 'capacidad', s.capacidad,
        'descripcion', s.descripcion, 'recargo', s.recargo) order by s.capacidad desc)
      from salones s where s.negocio_id = n.id and s.activo), '[]'::jsonb),
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', v.codigo, 'nombre', v.nombre, 'singular', v.singular, 'resumen', v.resumen,
        'descripcion', v.descripcion, 'incluye', v.incluye, 'precio_unitario', v.precio_unitario,
        'unidad', v.unidad, 'usa_salon', v.usa_salon, 'hora_sugerida', v.hora_sugerida,
        'max_por_pedido', v.max_por_pedido) order by v.orden)
      from servicios v where v.negocio_id = n.id and v.activo), '[]'::jsonb)
  )
  from negocios n
  where n.slug = p_slug and n.activo;
$$;

revoke all on function negocio_por_dominio(text), obtener_negocio(text) from public;
grant execute on function negocio_por_dominio(text), obtener_negocio(text) to anon, authenticated;

-- ===== supabase/seed.sql =====
-- Datos iniciales del negocio de demostración (requiere la migración 0004: usa la tabla dominios). Es seguro correrlo más de una vez.
-- Generado con scripts/generar-seed.ts: no editar a mano, cambiar src/lib/eventos.ts y regenerar.

insert into negocios (slug, nombre, direccion, whatsapp, whatsapp_visible, email_avisos, email_contacto,
  instagram, horarios, descripcion, logo_url, foto_url)
values ('resto-demo', 'Resto Demo', 'Calle Falsa 123, Ciudad Demo, Córdoba', '5493573443038',
  '3573 44-3038', 'fernandezgaspar13@gmail.com', 'fernandezgaspar13@gmail.com',
  array['restodemo', 'restodemo.eventos']::text[], array['Viandas todos los días', 'Almuerzos todos los días', 'Cenas de miércoles a sábado']::text[],
  'Bautismos, cumpleaños, casamientos y viandas en Ciudad Demo.', '/logo.svg', '/login-fondo.jpg')
on conflict (slug) do update set
  nombre = excluded.nombre, direccion = excluded.direccion, whatsapp = excluded.whatsapp,
  whatsapp_visible = excluded.whatsapp_visible, email_contacto = excluded.email_contacto,
  instagram = excluded.instagram, horarios = excluded.horarios, descripcion = excluded.descripcion,
  logo_url = excluded.logo_url, foto_url = excluded.foto_url;

insert into dominios (dominio, negocio_id)
select 'anduma-resto.vercel.app', id from negocios where slug = 'resto-demo'
on conflict (dominio) do nothing;

insert into salones (negocio_id, codigo, nombre, capacidad, descripcion, recargo)
select id, 'eventos', 'Salón de eventos', 160, 'El salón grande, pensado para fiestas y celebraciones.', 150000
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, capacidad = excluded.capacidad,
  descripcion = excluded.descripcion, recargo = excluded.recargo;

insert into salones (negocio_id, codigo, nombre, capacidad, descripcion, recargo)
select id, 'resto', 'Salón restó', 60, 'El salón del restaurante, más recogido y familiar.', 0
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, capacidad = excluded.capacidad,
  descripcion = excluded.descripcion, recargo = excluded.recargo;

insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
  precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden)
select id, 'bautismos', 'Bautismos', 'Bautismo', 'Un almuerzo en familia, sin vueltas', 'Cocina casera y cuidada para recibir a los invitados después de la ceremonia.',
  array['Menú a pedido, armado con vos', 'Salón a elección', 'Atención de mesa', 'Opciones para celíacos y vegetarianos']::text[], 18000, 'personas', true, '12:30',
  null, 0
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, singular = excluded.singular, resumen = excluded.resumen,
  descripcion = excluded.descripcion, incluye = excluded.incluye,
  precio_unitario = excluded.precio_unitario, unidad = excluded.unidad,
  usa_salon = excluded.usa_salon, hora_sugerida = excluded.hora_sugerida,
  max_por_pedido = excluded.max_por_pedido, orden = excluded.orden;

insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
  precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden)
select id, 'cumpleanos', 'Cumpleaños', 'Cumpleaños', 'De los 3 a los 90, con la mesa llena', 'Infantiles, de quince o reuniones de amigos. Comida abundante y clima de fiesta.',
  array['Menú a pedido', 'Salón a elección', 'Atención de mesa', 'Espacio para torta y música']::text[], 16000, 'personas', true, '21:00',
  null, 1
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, singular = excluded.singular, resumen = excluded.resumen,
  descripcion = excluded.descripcion, incluye = excluded.incluye,
  precio_unitario = excluded.precio_unitario, unidad = excluded.unidad,
  usa_salon = excluded.usa_salon, hora_sugerida = excluded.hora_sugerida,
  max_por_pedido = excluded.max_por_pedido, orden = excluded.orden;

insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
  precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden)
select id, 'casamientos', 'Casamientos', 'Casamiento', 'El menú de tu fiesta, de punta a punta', 'Recepción, cena y barra para el día más importante. Coordinamos los tiempos con vos.',
  array['Menú de varios pasos a pedido', 'Salón de eventos o salón restó', 'Personal de cocina y de sala', 'Reunión previa para definir el menú']::text[], 32000, 'personas', true, '21:00',
  null, 2
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, singular = excluded.singular, resumen = excluded.resumen,
  descripcion = excluded.descripcion, incluye = excluded.incluye,
  precio_unitario = excluded.precio_unitario, unidad = excluded.unidad,
  usa_salon = excluded.usa_salon, hora_sugerida = excluded.hora_sugerida,
  max_por_pedido = excluded.max_por_pedido, orden = excluded.orden;

insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
  precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden)
select id, 'viandas', 'Viandas', 'Viandas', 'Para empresas, obras y grupos', 'Viandas por encargo para equipos de trabajo, jornadas o reuniones. Se retiran o se entregan.',
  array['Menú del día o a pedido', 'Envasado individual', 'Retiro en el local o entrega', 'Pedidos fijos por semana']::text[], 6500, 'viandas', false, '12:00',
  300, 3
from negocios where slug = 'resto-demo'
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, singular = excluded.singular, resumen = excluded.resumen,
  descripcion = excluded.descripcion, incluye = excluded.incluye,
  precio_unitario = excluded.precio_unitario, unidad = excluded.unidad,
  usa_salon = excluded.usa_salon, hora_sugerida = excluded.hora_sugerida,
  max_por_pedido = excluded.max_por_pedido, orden = excluded.orden;


