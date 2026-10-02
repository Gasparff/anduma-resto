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
