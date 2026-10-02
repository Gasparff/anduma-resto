-- Pruebas de aislamiento entre negocios (migración 0004). Correr con:
--   psql -d <base> -f 00_mock_supabase.sql -f ../migrations/0001_esquema_inicial.sql \
--        -f ../migrations/0002_estado_solicitudes.sql -f ../migrations/0003_limites_anti_spam.sql \
--        -f ../migrations/0004_multinegocio.sql -f ../seed.sql -f 04_multinegocio.sql
-- Las líneas marcadas "(debe fallar)" tienen que mostrar un ERROR; el resto, el valor esperado.
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

-- Negocio 1 = resto-demo (del seed), con su chef.
insert into miembros select id, '11111111-1111-1111-1111-111111111111', 'dueno' from negocios where slug = 'resto-demo';

-- Negocio 2 = otro restaurante, con otro chef, otra marca y otro catálogo.
insert into negocios (slug, nombre, email_avisos, email_contacto, color_primario, color_acento)
  values ('otro-resto', 'La Parrilla de Juan', 'privado@otro.com', 'hola@otro.com', '#1f4e79', '#d4a017');
insert into miembros select id, '22222222-2222-2222-2222-222222222222', 'dueno' from negocios where slug = 'otro-resto';
insert into dominios select 'reservas.otro.com', id from negocios where slug = 'otro-resto';
insert into salones (negocio_id, codigo, nombre, capacidad, recargo)
  select id, 'patio', 'Patio', 40, 0 from negocios where slug = 'otro-resto';
insert into servicios (negocio_id, codigo, nombre, singular, precio_unitario, usa_salon, unidad)
  select id, 'asados', 'Asados', 'Asado', 12000, true, 'personas' from negocios where slug = 'otro-resto';
-- Un negocio dado de baja.
insert into negocios (slug, nombre, activo) values ('cerrado', 'Cerrado', false);
insert into dominios select 'cerrado.com', id from negocios where slug = 'cerrado';

set role anon;
select 'T1 el público no puede listar negocios (debe fallar)';
select count(*) from negocios;
select 'T2 ni salones (debe fallar)';
select count(*) from salones;
select 'T3 ni servicios (debe fallar)';
select count(*) from servicios;
select 'T4 ni dominios (debe fallar)';
select count(*) from dominios;

select 'T5 obtener_negocio devuelve solo el pedido', obtener_negocio('resto-demo')->'negocio'->>'nombre',
  jsonb_array_length(obtener_negocio('resto-demo')->'salones'),
  jsonb_array_length(obtener_negocio('resto-demo')->'servicios');
select 'T6 el otro negocio devuelve solo lo suyo', obtener_negocio('otro-resto')->'negocio'->>'nombre',
  obtener_negocio('otro-resto')->'negocio'->>'color_primario',
  obtener_negocio('otro-resto')->'salones'->0->>'codigo',
  obtener_negocio('otro-resto')->'servicios'->0->>'codigo';
select 'T7 no se filtra el mail privado (esperado f)', (obtener_negocio('otro-resto')->'negocio') ? 'email_avisos';
select 'T8 slug inexistente o dado de baja devuelve null (esperado t, t)',
  obtener_negocio('no-existe') is null, obtener_negocio('cerrado') is null;
select 'T9 dominio -> slug', negocio_por_dominio('reservas.otro.com'), negocio_por_dominio('  RESERVAS.Otro.COM '),
  negocio_por_dominio('anduma-resto.vercel.app');
select 'T10 dominio desconocido o de negocio de baja (esperado null, null)',
  negocio_por_dominio('desconocido.com'), negocio_por_dominio('cerrado.com');

-- Los pedidos de un negocio no mezclan catálogos: un servicio del otro negocio no existe acá.
select 'T11 servicio de otro negocio (debe fallar)';
select crear_solicitud('resto-demo','asados','resto','Ana','3573443038','',current_date+5,'21:00',10);
select crear_solicitud('otro-resto','asados','patio','Pedro','3571112222','',current_date+5,'21:00',10) as sp \gset
reset role;

-- Chef 1 (resto-demo)
select id as id_demo from negocios where slug = 'resto-demo' \gset
set role authenticated;
set "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
select 'T12 el chef 1 ve solo su negocio (esperado 1, resto-demo)', count(*), min(slug) from negocios;
select 'T13 el chef 1 ve solo sus salones/servicios (esperado 2, 4)',
  (select count(*) from salones), (select count(*) from servicios);
select 'T14 el chef 1 no ve pedidos del otro negocio (esperado 0)', count(*) from solicitudes;
select 'T15 el chef 1 no ve dominios ajenos (esperado 1)', count(*) from dominios;
select 'T16 el chef 1 no puede responder pedidos ajenos (debe fallar)';
select responder_solicitud(:'sp'::uuid, 'confirmada');
update negocios set nombre = 'HACKEADO' where slug = 'otro-resto';
select 'T17 el chef 1 no pudo renombrar al otro (esperado La Parrilla de Juan)';
reset role;
select nombre from negocios where slug = 'otro-resto';

-- Chef 2 (otro-resto)
set role authenticated;
set "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
select 'T18 el chef 2 ve solo su negocio (esperado 1, otro-resto)', count(*), min(slug) from negocios;
select 'T19 el chef 2 ve su pedido (esperado 1)', count(*) from solicitudes;
select 'T20 el chef 2 no ve el catálogo del primero (esperado 1 salón, 1 servicio)',
  (select count(*) from salones), (select count(*) from servicios);
select 'T21 el chef 2 no puede escribir en el catálogo del primero (debe fallar)';
insert into servicios (negocio_id, codigo, nombre, singular) values (:'id_demo'::uuid, 'x', 'X', 'X');
select 'T22 ni borrar sus salones (esperado 0 filas afectadas, el negocio 1 conserva 2)';
delete from salones where negocio_id = :'id_demo'::uuid;
reset role;
select 'T23 el catálogo del primero quedó intacto (esperado 2 salones, 4 servicios)',
  (select count(*) from salones where negocio_id = :'id_demo'::uuid),
  (select count(*) from servicios where negocio_id = :'id_demo'::uuid);
