-- Datos iniciales del negocio de demostración. Es seguro correrlo más de una vez.
-- Generado con scripts/generar-seed.ts: no editar a mano, cambiar src/lib/eventos.ts y regenerar.

insert into negocios (slug, nombre, direccion, whatsapp, email_avisos, instagram, horarios)
values ('resto-demo', 'Resto Demo', 'Calle Falsa 123, Ciudad Demo, Córdoba', '5493573443038', 'fernandezgaspar13@gmail.com',
  array['restodemo', 'restodemo.eventos']::text[], array['Viandas todos los días', 'Almuerzos todos los días', 'Cenas de miércoles a sábado']::text[])
on conflict (slug) do update set
  nombre = excluded.nombre, direccion = excluded.direccion, whatsapp = excluded.whatsapp,
  instagram = excluded.instagram, horarios = excluded.horarios;

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

