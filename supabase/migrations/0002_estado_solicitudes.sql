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
