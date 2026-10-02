/**
 * Aviso al celular del chef cuando entra un pedido. El envío real lo hace el servidor
 * (src/lib/avisos-servidor.ts): el navegador solo le cuenta qué pedido se creó. Si falla, no pasa
 * nada: el pedido ya está guardado en la base.
 */
import { avisarPedido, type AvisoPedido } from "@/lib/avisos-servidor";

export function avisarAlChef(aviso: AvisoPedido) {
  void avisarPedido({ data: aviso }).catch(() => {
    // Sin conexión con el servidor: el aviso es un extra.
  });
}
