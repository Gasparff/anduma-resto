-- Robustez (opcional): la app funciona igual sin esta migración y la aprovecha sola cuando se aplica.
--  1. crear_solicitud: un doble envío o un reintento no duplica el pedido (ni vuelve a avisar).
--  2. anotar_lista_espera: validaciones y límites de frecuencia (era pública y sin límites).
--  3. expirar_pedidos_vencidos: pasa a "cancelada" lo pendiente cuya fecha ya pasó.
--  4. El chef puede borrar entradas de su lista de espera.
--  5. Tiempo real: el panel del chef se actualiza al instante cuando entra un pedido.

-- ---------------------------------------------------------------------------
-- 1. Sin duplicados por doble envío
-- ---------------------------------------------------------------------------
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

  -- Doble envío o reintento: si ya hay un pedido pendiente idéntico de este teléfono creado en los
  -- últimos 10 minutos, se devuelve ese mismo (sin duplicar ni volver a avisar al chef).
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  select s.id into v_id from solicitudes s
   join servicios sv on sv.id = s.servicio_id
   left join salones sa on sa.id = s.salon_id
   where s.negocio_id = v_negocio.id and s.estado = 'pendiente'
     and s.creada_en > now() - interval '10 minutes'
     and regexp_replace(s.telefono, '\D', '', 'g') = v_tel
     and s.fecha = p_fecha and s.hora = p_hora and s.personas = p_personas
     and sv.codigo = p_servicio and coalesce(sa.codigo, '') = coalesce(p_salon, '')
   limit 1;
  if v_id is not null then return v_id; end if;

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


-- ---------------------------------------------------------------------------
-- 2. Lista de espera con límites
-- ---------------------------------------------------------------------------
create or replace function anotar_lista_espera(
  p_slug text, p_salon text, p_fecha date, p_nombre text, p_telefono text, p_personas integer
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_negocio uuid;
  v_salon uuid;
  v_id uuid;
  v_tel text;
begin
  select id into v_negocio from negocios where slug = p_slug and activo;
  if v_negocio is null then raise exception 'Negocio no encontrado'; end if;

  if length(trim(coalesce(p_nombre, ''))) = 0 or length(p_nombre) > 80 then
    raise exception 'Escribí tu nombre (hasta 80 caracteres)';
  end if;
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 8 or length(v_tel) > 20 then raise exception 'Escribí un WhatsApp válido'; end if;
  if p_personas is not null and (p_personas < 1 or p_personas > 2000) then
    raise exception 'Cantidad inválida';
  end if;
  if p_fecha is null or p_fecha < current_date or p_fecha > current_date + 730 then
    raise exception 'La fecha elegida no es válida';
  end if;

  select id into v_salon from salones where negocio_id = v_negocio and codigo = p_salon;

  -- Mismo teléfono, misma fecha y salón: ya está anotado.
  select id into v_id from lista_espera
   where negocio_id = v_negocio and fecha = p_fecha and salon_id is not distinct from v_salon
     and regexp_replace(telefono, '\D', '', 'g') = v_tel
   limit 1;
  if v_id is not null then return v_id; end if;

  if (select count(*) from lista_espera
       where negocio_id = v_negocio and creada_en > now() - interval '1 hour'
         and regexp_replace(telefono, '\D', '', 'g') = v_tel) >= 5 then
    raise exception 'Te anotaste en varias fechas seguidas. Esperá un rato o escribinos por WhatsApp.';
  end if;
  if (select count(*) from lista_espera
       where negocio_id = v_negocio and creada_en > now() - interval '1 hour') >= 100 then
    raise exception 'Estamos recibiendo muchas consultas en este momento. Probá de nuevo en un rato.';
  end if;

  insert into lista_espera (negocio_id, salon_id, fecha, nombre, telefono, personas)
  values (v_negocio, v_salon, p_fecha, trim(p_nombre), p_telefono, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Pedidos vencidos
-- ---------------------------------------------------------------------------
create or replace function expirar_pedidos_vencidos(p_negocio uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_cantidad integer;
begin
  if not es_miembro(p_negocio) then raise exception 'Sin permiso'; end if;
  update solicitudes
     set estado = 'cancelada', respondida_en = now()
   where negocio_id = p_negocio and estado = 'pendiente' and fecha < current_date;
  get diagnostics v_cantidad = row_count;
  return v_cantidad;
end;
$$;

revoke all on function expirar_pedidos_vencidos(uuid) from public, anon;
grant execute on function expirar_pedidos_vencidos(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. El chef puede borrar entradas de su lista de espera
-- ---------------------------------------------------------------------------
grant delete on lista_espera to authenticated;
drop policy if exists lista_espera_borrar on lista_espera;
create policy lista_espera_borrar on lista_espera for delete using (es_miembro(negocio_id));

-- ---------------------------------------------------------------------------
-- 5. Tiempo real (solo si el proyecto es Supabase, que trae la publicación supabase_realtime)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['solicitudes', 'eventos'] loop
      if not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
