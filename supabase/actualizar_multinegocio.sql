-- =============================================================================
--  ACTUALIZACIÓN A MULTI-NEGOCIO (pegar UNA vez en Supabase → SQL Editor → Run)
--  Para bases que ya tienen instaladas las migraciones 0001, 0002 y 0003.
--  Contiene: migrations/0004 + seed.sql (el seed se puede repetir sin problema).
--  Generado a partir de esos archivos: no editar a mano.
-- =============================================================================

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


