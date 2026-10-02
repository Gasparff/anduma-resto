// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Solo en desarrollo: recarga la página cuando cambia algo de /public (logo, imágenes),
// que Vite no recarga por su cuenta.
const recargarPorPublic = {
  name: "recargar-por-public",
  configureServer(server: {
    watcher: { add: (p: string) => void; on: (e: string, cb: (f: string) => void) => void };
    config: { publicDir: string };
    ws: { send: (m: { type: "full-reload" }) => void };
  }) {
    const dir = server.config.publicDir;
    if (!dir) return;
    server.watcher.add(dir);
    const recargar = (archivo: string) => {
      if (archivo.startsWith(dir)) server.ws.send({ type: "full-reload" });
    };
    server.watcher.on("change", recargar);
    server.watcher.on("add", recargar);
  },
};

export default defineConfig({
  vite: { plugins: [recargarPorPublic] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
