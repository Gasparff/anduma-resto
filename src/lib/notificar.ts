/**
 * Avisos al celular del chef cuando entra un pedido nuevo, usando ntfy.sh (gratis, sin cuenta).
 * El chef instala la app "ntfy" y se suscribe al tema configurado en VITE_NTFY_TOPIC.
 * Sin esa variable no se envía nada.
 *
 * Ojo: el tema viaja en el código del navegador, así que sirve para avisos simples. Para algo
 * privado de verdad hay que mandar el aviso desde un servidor (ver docs/BACKEND.md).
 */
const TEMA = (import.meta.env["VITE_NTFY_TOPIC"] as string | undefined)?.trim();

type Aviso = { titulo: string; mensaje: string; clic?: string };

export function avisarAlChef({ titulo, mensaje, clic }: Aviso) {
  if (!TEMA) return;
  fetch("https://ntfy.sh", {
    method: "POST",
    body: JSON.stringify({
      topic: TEMA,
      title: titulo,
      message: mensaje,
      priority: 4,
      tags: ["bell"],
      ...(clic ? { click: clic } : {}),
    }),
  }).catch(() => {
    // Sin conexión o bloqueado: el pedido ya quedó guardado, el aviso es un extra.
  });
}
