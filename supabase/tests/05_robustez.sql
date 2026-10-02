-- Pruebas de la migración 0005. Correr con:
--   psql -d <base> -f 00_mock_supabase.sql -f 05_publicacion_falsa.sql -f ../migrations/0001_esquema_inicial.sql \
--        -f ../migrations/0002_estado_solicitudes.sql -f ../migrations/0003_limites_anti_spam.sql \
--        -f ../migrations/0004_multinegocio.sql -f ../seed.sql -f ../migrations/0005_robustez.sql -f 05_robustez.sql
-- Las líneas marcadas "(debe fallar)" tienen que mostrar un ERROR; el resto, el valor esperado.
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into miembros select id, '11111111-1111-1111-1111-111111111111', 'dueno' from negocios where slug = 'resto-demo';
insert into negocios (slug, nombre) values ('otro', 'Otro');
insert into miembros select id, '22222222-2222-2222-2222-222222222222', 'dueno' from negocios where slug = 'otro';
select id as id_demo from negocios where slug = 'resto-demo' \gset

set role anon;
-- 1. Doble envío
select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573 44-3038','',current_date+10,'21:00',30) as s1 \gset
select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+10,'21:00',30) as s2 \gset
select 'T1 el doble envío devuelve el mismo pedido (esperado t)', :'s1' = :'s2' as mismo;
reset role;
select 'T2 y no se duplicó (esperado 1 pedido, 1 aviso)', (select count(*) from solicitudes), (select count(*) from avisos);
set role anon;
select 'T3 otra fecha sí es otro pedido (esperado t)', crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+11,'21:00',30) <> :'s1'::uuid;
select 'T4 otra cantidad sí es otro pedido (esperado t)', crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+10,'21:00',31) <> :'s1'::uuid;
-- el reintento no cuenta contra el límite de 3 por hora: ya hay 3 pedidos distintos de este teléfono
select 'T5 un reintento de un pedido existente NO se frena por el límite (esperado t)', crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+10,'21:00',30) = :'s1'::uuid;
select 'T6 un pedido nuevo del mismo teléfono sí se frena (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+12,'21:00',30);

-- 2. Lista de espera
select 'T7 anotarse en la lista de espera', anotar_lista_espera('resto-demo','eventos', current_date+20, 'Beto', '3571112222', 40) is not null;
select 'T8 anotarse de nuevo en lo mismo devuelve la misma entrada (esperado 1 fila)',
  (select count(*) from (select anotar_lista_espera('resto-demo','eventos', current_date+20, 'Beto', '3571112222', 40)) x);
select 'T9 nombre vacío (debe fallar)';
select anotar_lista_espera('resto-demo','eventos', current_date+20, '', '3571112222', 40);
select 'T10 teléfono corto (debe fallar)';
select anotar_lista_espera('resto-demo','eventos', current_date+20, 'Beto', '12', 40);
select 'T11 fecha pasada (debe fallar)';
select anotar_lista_espera('resto-demo','eventos', current_date-1, 'Beto', '3571112222', 40);
select 'T12 cantidad absurda (debe fallar)';
select anotar_lista_espera('resto-demo','eventos', current_date+20, 'Beto', '3571112222', 999999);
select anotar_lista_espera('resto-demo','eventos', current_date+21, 'Beto', '3571112222', 5) is not null as f2 \gset
select anotar_lista_espera('resto-demo','eventos', current_date+22, 'Beto', '3571112222', 5) is not null as f3 \gset
select anotar_lista_espera('resto-demo','eventos', current_date+23, 'Beto', '3571112222', 5) is not null as f4 \gset
select anotar_lista_espera('resto-demo','eventos', current_date+24, 'Beto', '3571112222', 5) is not null as f5 \gset
select 'T13 la 6ª fecha distinta en una hora se frena (debe fallar)';
select anotar_lista_espera('resto-demo','eventos', current_date+25, 'Beto', '3571112222', 5);
reset role;

-- 3. Pedidos vencidos
insert into solicitudes (negocio_id, servicio_id, anfitrion, telefono, fecha, hora, personas)
  select :'id_demo'::uuid, (select id from servicios where codigo='viandas' and negocio_id=:'id_demo'::uuid), 'Viejo', '35700000001', current_date-5, '12:00', 10;
set role anon;
select 'T14 el público no puede expirar pedidos (debe fallar)';
select expirar_pedidos_vencidos(:'id_demo'::uuid);
set role authenticated;
set "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
select 'T15 un chef de OTRO negocio no puede (debe fallar)';
select expirar_pedidos_vencidos(:'id_demo'::uuid);
set "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
select 'T16 el chef del negocio expira 1 vencido', expirar_pedidos_vencidos(:'id_demo'::uuid);
select 'T17 y lo vencido quedó cancelado, lo vigente intacto (esperado cancelada 1, pendiente 3)',
  (select count(*) from solicitudes where estado='cancelada'), (select count(*) from solicitudes where estado='pendiente');
select 'T18 expirar de nuevo no hace nada (esperado 0)', expirar_pedidos_vencidos(:'id_demo'::uuid);

-- 4. Borrar de la lista de espera
select 'T19 el chef ve su lista de espera (esperado 5)', count(*) from lista_espera;
delete from lista_espera where fecha = current_date+20;
select 'T20 y puede borrar entradas (esperado 4 restantes)', count(*) from lista_espera;
set "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
delete from lista_espera;
select 'T21 un chef de otro negocio no borra nada ajeno (esperado 0 borradas)';
reset role;
select 'T22 la lista del primero sigue intacta (esperado 4)', count(*) from lista_espera;
set role anon;
select 'T23 el público no puede borrar (debe fallar)';
delete from lista_espera;
reset role;

-- 5. Tiempo real
select 'T24 publicación de tiempo real incluye solicitudes y eventos (esperado eventos,solicitudes)',
  string_agg(tablename, ',' order by tablename) from pg_publication_tables where pubname = 'supabase_realtime';
