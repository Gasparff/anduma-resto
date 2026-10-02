-- =============================================================================
--  ALTA DE UN RESTAURANTE NUEVO (Supabase → SQL Editor → pegar → Run)
--
--  Antes de correrlo:
--   1. Creá el usuario del dueño: Authentication → Users → Add user → Create new user
--      (correo y contraseña, y tildar "Auto Confirm User").
--   2. Agregá su dirección web en Vercel: Project → Settings → Domains → Add
--      (un subdominio tuyo, ej. laparrilla.tuplataforma.com, o un dominio propio del restaurante).
--
--  Después: editá SOLO la sección de abajo ("EDITAR") y tocá Run.
--  Cada restaurante ve únicamente lo suyo; ninguno sabe de los demás.
-- =============================================================================
do $$
declare
  -- ===================== EDITAR SOLO ESTA SECCIÓN =====================
  v_slug             text   := 'la-parrilla';                 -- identificador interno: minúsculas, sin espacios
  v_nombre           text   := 'La Parrilla de Juan';
  v_dominio          text   := 'laparrilla.tuplataforma.com'; -- dirección web, sin https:// y en minúsculas
  v_direccion        text   := 'Av. Siempreviva 742, Rosario';
  v_whatsapp         text   := '5493415551234';               -- formato wa.me: 54 9 + característica + número
  v_whatsapp_visible text   := '341 555-1234';
  v_email_avisos     text   := 'avisos@laparrilla.com';       -- donde llegan los avisos de pedidos (privado)
  v_email_contacto   text   := 'hola@laparrilla.com';         -- el que se muestra al público
  v_instagram        text[] := array['laparrilladejuan'];
  v_horarios         text[] := array['Cenas de jueves a domingo'];
  v_descripcion      text   := 'Asados y parrilla para tus reuniones en Rosario.';
  v_color_primario   text   := '#1f4e79';                     -- color de la marca (6 dígitos hex)
  v_color_acento     text   := '#d4a017';                     -- color de detalles
  v_logo_url         text   := null;                          -- ej. 'https://.../logo.png' (si no, se usan las iniciales)
  v_correo_del_dueno text   := 'juan@laparrilla.com';         -- el usuario creado en el paso 1
  -- ====================================================================
  v_id      uuid;
  v_usuario uuid;
begin
  select id into v_usuario from auth.users where email = lower(trim(v_correo_del_dueno));
  if v_usuario is null then
    raise exception 'No existe el usuario %. Crealo primero en Authentication → Users (con Auto Confirm).', v_correo_del_dueno;
  end if;

  insert into negocios (slug, nombre, direccion, whatsapp, whatsapp_visible, email_avisos, email_contacto,
                        instagram, horarios, descripcion, color_primario, color_acento, logo_url)
  values (v_slug, v_nombre, v_direccion, v_whatsapp, v_whatsapp_visible, v_email_avisos, v_email_contacto,
          v_instagram, v_horarios, v_descripcion, v_color_primario, v_color_acento, v_logo_url)
  returning id into v_id;

  insert into dominios (dominio, negocio_id) values (lower(trim(v_dominio)), v_id);
  insert into miembros (negocio_id, usuario_id, rol) values (v_id, v_usuario, 'dueno');

  -- Salones del restaurante: (código, nombre, capacidad, descripción, recargo fijo en pesos).
  insert into salones (negocio_id, codigo, nombre, capacidad, descripcion, recargo) values
    (v_id, 'patio',   'Patio',   40,  'Al aire libre, con parrilla a la vista.', 0),
    (v_id, 'quincho', 'Quincho', 120, 'Techado, para grupos grandes.',           20000);

  -- Servicios: (código, nombre, singular, resumen, descripción, qué incluye, precio por unidad,
  --             unidad, ¿usa salón?, hora sugerida, tope por pedido, orden).
  insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
                         precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden) values
    (v_id, 'asados', 'Asados', 'Asado', 'Parrilla libre para tu grupo',
       'Cortes a la parrilla, ensaladas y postre, con parrillero a cargo.',
       array['Parrillero a cargo', 'Ensaladas y guarniciones', 'Postre'],
       12000, 'personas', true, '20:30', null, 0),
    (v_id, 'catering', 'Catering', 'Catering', 'Para empresas y eventos',
       'Bandejas para llevar o entrega en tu lugar.',
       array['Bandejas individuales', 'Entrega o retiro'],
       9000, 'viandas', false, '12:00', 80, 1);

  raise notice 'Listo: "%" quedó dado de alta en % (dueño: %).', v_nombre, v_dominio, v_correo_del_dueno;
end $$;
