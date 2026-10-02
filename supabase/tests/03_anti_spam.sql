-- Pruebas de la migración 0003. Correr después de 00, 0001, 0002, seed y 0003:
--   psql -d <base> -f 00_mock_supabase.sql -f ../migrations/0001_esquema_inicial.sql \
--        -f ../migrations/0002_estado_solicitudes.sql -f ../seed.sql \
--        -f ../migrations/0003_limites_anti_spam.sql -f 03_anti_spam.sql
set role anon;
select 'T1 pedidos 1 a 3 del mismo teléfono entran (esperado 3)', count(*) from (
  select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573 44-3038','',current_date+d,'21:00',20) from generate_series(10,12) d) x;
select 'T2 el 4º pedido en una hora se frena (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+13,'21:00',20);
select 'T3 otro teléfono sigue pudiendo pedir', crear_solicitud('resto-demo','cumpleanos','resto','Beto','3571112222','',current_date+14,'21:00',20) is not null;
select 'T4 comentario de más de 1000 caracteres (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Cami','3572223333','',current_date+15,'21:00',20, repeat('x',1001));
select 'T5 nombre de más de 80 caracteres (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto',repeat('n',81),'3572223333','',current_date+15,'21:00',20);
select 'T6 fecha a más de 2 años (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Cami','3572223333','',current_date+800,'21:00',20);
select 'T7 más de 10 opciones de menú (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Cami','3572223333','',current_date+16,'21:00',20,'', array(select 'd'||i from generate_series(1,11) i));
select 'T8 las reglas de negocio siguen: sobre capacidad (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','Cami','3572223333','',current_date+17,'21:00',61);
reset role;
select 'T9 tope general: 40 pedidos por hora (esperado fallo en el 41)';
insert into solicitudes (negocio_id, servicio_id, anfitrion, telefono, fecha, hora, personas)
  select n.id, (select id from servicios where codigo='viandas' limit 1), 'Bot'||i, '35700000'||lpad(i::text,2,'0'), current_date+1, '12:00', 10
  from negocios n, generate_series(1,40) i where n.slug='resto-demo';
set role anon;
select crear_solicitud('resto-demo','viandas',null,'Otro','3579998888','',current_date+2,'12:00',10);
