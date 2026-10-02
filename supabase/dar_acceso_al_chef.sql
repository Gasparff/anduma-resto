-- Da acceso de administrador del restaurante a un usuario.
-- Antes: en Supabase → Authentication → Users → Add user → Create new user
--        (correo y contraseña, y tildar "Auto Confirm User").
-- Después: cambiá el correo de abajo por el de ese usuario y tocá Run.
insert into miembros (negocio_id, usuario_id, rol)
select n.id, u.id, 'dueno'
from negocios n, auth.users u
where n.slug = 'resto-demo' and u.email = 'CAMBIAR@correo.com'
on conflict do nothing;

-- Tiene que mostrar 1 (o más). Si muestra 0, el correo no coincide con ningún usuario.
select count(*) as chefs_con_acceso from miembros;
