-- Escenario de prueba de las reglas de negocio y permisos. Correr con:
--   psql -d <base> -f 00_mock_supabase.sql -f ../migrations/0001_esquema_inicial.sql -f 01_escenario.sql
-- Las líneas marcadas "(debe fallar)" tienen que mostrar un ERROR; el resto, el valor esperado.
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into negocios (id, slug, nombre, email_avisos) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'resto-demo', 'Resto Demo', 'chef@demo.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'otro', 'Otro', 'o@demo.com');
insert into miembros values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'dueno'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'dueno');
insert into salones (negocio_id, codigo, nombre, capacidad, recargo) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'eventos', 'Salón de eventos', 160, 150000),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'resto', 'Salón restó', 60, 0);
insert into servicios (negocio_id, codigo, nombre, singular, precio_unitario, usa_salon, unidad) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cumpleanos', 'Cumpleaños', 'Cumpleaños', 16000, true, 'personas'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'viandas', 'Viandas', 'Viandas', 6500, false, 'viandas');

set role anon;
select crear_solicitud('resto-demo','cumpleanos','eventos','Ana','35734430','',current_date+10,'21:00',40) as s1 \gset
select crear_solicitud('resto-demo','cumpleanos','eventos','Beto','35734430','',current_date+10,'21:00',20) as s2 \gset
select 'T2 anónimo no lee solicitudes (debe fallar)';
select count(*) from solicitudes;
select 'T3 viandas sin salón', crear_solicitud('resto-demo','viandas',null,'Cons','35734430','',current_date+1,'12:00',100) is not null;
select 'T4 sobre capacidad (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','resto','X','35734431','',current_date+3,'21:00',61);
select 'T5 día pasado (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','eventos','X','35734432','',current_date-1,'21:00',10);
reset role;

select 'T6 presupuesto esperado 790000', presupuesto from solicitudes where anfitrion = 'Ana';

set role authenticated;
set "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
select 'T7 otro negocio no ve solicitudes (esperado 0)', count(*) from solicitudes;
select 'T8 otro negocio no puede responder (debe fallar)';
select responder_solicitud(:'s1'::uuid, 'confirmada');

set "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
select 'T9 el chef ve sus solicitudes (esperado 3)', count(*) from solicitudes;
select responder_solicitud(:'s1'::uuid, 'confirmada');
select 'T10 doble reserva del mismo salón y día (debe fallar)';
select responder_solicitud(:'s2'::uuid, 'confirmada');
reset role;

select 'T11 estados', string_agg(anfitrion || '=' || estado, ', ' order by anfitrion)
  from solicitudes where anfitrion in ('Ana', 'Beto');

set role anon;
select 'T12 salón ya ocupado (debe fallar)';
select crear_solicitud('resto-demo','cumpleanos','eventos','Z','35734433','',current_date+10,'21:00',5);
select 'T13 fechas ocupadas (esperado 1)', count(*) from fechas_ocupadas('resto-demo');
select 'T14 anónimo no lee eventos (debe fallar)';
select count(*) from eventos;
reset role;
