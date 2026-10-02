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
