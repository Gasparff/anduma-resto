-- Pruebas de la migración 0002. Correr con:
--   psql -d <base> -f 00_mock_supabase.sql -f ../migrations/0001_esquema_inicial.sql \
--        -f ../migrations/0002_estado_solicitudes.sql -f ../seed.sql -f 02_catalogo_y_estado.sql
set role anon;
select 'T1 catálogo visible al público (esperado 4 servicios)', count(*) from servicios;
select 'T2 salones visibles al público (esperado 2)', count(*) from salones;
select 'T3 datos de presentación del negocio (esperado 1)', count(*) from (select id, slug, nombre from negocios) x;
select 'T4 el público no lee email_avisos (debe fallar)';
select email_avisos from negocios;
select crear_solicitud('resto-demo','cumpleanos','resto','Ana','3573443038','',current_date+5,'21:00',30) as s1 \gset
select 'T5 estado de un pedido propio (esperado pendiente)', estado from estado_solicitudes(array[:'s1'::uuid]);
select 'T6 ids ajenos o inventados no devuelven nada (esperado 0)', count(*)
  from estado_solicitudes(array['00000000-0000-0000-0000-000000000000'::uuid]);
select 'T7 el público no lee solicitudes directo (debe fallar)';
select count(*) from solicitudes;
