/**
 * Genera supabase/seed.sql con los datos del negocio y el catálogo, a partir de las mismas
 * constantes que usa la app (src/lib/eventos.ts), para que base y pantalla no se desalineen.
 * Uso: npx vite-node scripts/generar-seed.ts > supabase/seed.sql
 */
import { LISTA_SALONES, MAX_VIANDAS, NEGOCIO, RECARGO_SALON, SERVICIOS } from "../src/lib/eventos";

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const arr = (v: readonly string[]) => `array[${v.map(q).join(", ")}]::text[]`;

const SLUG = "resto-demo";
const out: string[] = [];

out.push(`-- Datos iniciales del negocio de demostración. Es seguro correrlo más de una vez.
-- Generado con scripts/generar-seed.ts: no editar a mano, cambiar src/lib/eventos.ts y regenerar.
`);
out.push(`insert into negocios (slug, nombre, direccion, whatsapp, email_avisos, instagram, horarios)
values (${q(SLUG)}, ${q(NEGOCIO.nombre)}, ${q(NEGOCIO.direccion)}, ${q(NEGOCIO.whatsapp)}, ${q(NEGOCIO.email)},
  ${arr(NEGOCIO.instagram.map((i) => i.usuario))}, ${arr(NEGOCIO.horarios)})
on conflict (slug) do update set
  nombre = excluded.nombre, direccion = excluded.direccion, whatsapp = excluded.whatsapp,
  instagram = excluded.instagram, horarios = excluded.horarios;
`);
for (const s of LISTA_SALONES) {
  out.push(`insert into salones (negocio_id, codigo, nombre, capacidad, descripcion, recargo)
select id, ${q(s.id)}, ${q(s.nombre)}, ${s.capacidad}, ${q(s.descripcion)}, ${RECARGO_SALON[s.id]}
from negocios where slug = ${q(SLUG)}
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, capacidad = excluded.capacidad,
  descripcion = excluded.descripcion, recargo = excluded.recargo;
`);
}
SERVICIOS.forEach((s, i) => {
  out.push(`insert into servicios (negocio_id, codigo, nombre, singular, resumen, descripcion, incluye,
  precio_unitario, unidad, usa_salon, hora_sugerida, max_por_pedido, orden)
select id, ${q(s.id)}, ${q(s.nombre)}, ${q(s.singular)}, ${q(s.resumen)}, ${q(s.descripcion)},
  ${arr(s.incluye)}, ${s.precioUnitario}, ${q(s.unidad)}, ${s.usaSalon}, ${q(s.horaSugerida)},
  ${s.usaSalon ? "null" : MAX_VIANDAS}, ${i}
from negocios where slug = ${q(SLUG)}
on conflict (negocio_id, codigo) do update set
  nombre = excluded.nombre, singular = excluded.singular, resumen = excluded.resumen,
  descripcion = excluded.descripcion, incluye = excluded.incluye,
  precio_unitario = excluded.precio_unitario, unidad = excluded.unidad,
  usa_salon = excluded.usa_salon, hora_sugerida = excluded.hora_sugerida,
  max_por_pedido = excluded.max_por_pedido, orden = excluded.orden;
`);
});
console.log(out.join("\n"));
