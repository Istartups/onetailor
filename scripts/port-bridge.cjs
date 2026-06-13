#!/usr/bin/env node
/**
 * Port Bridge — forwards Replit's duplicate external port mappings to the
 * actual running services.
 *
 * .replit maps two local ports to the same external port for each service:
 *   external 80   → local 5000 (PWA, first)  AND local 8081 (second)
 *   external 3000 → local 3000 (API, first)  AND local 25497 (second)
 *   external 3002 → local 3002 (Admin, first) AND local 25580 (second)
 *
 * Replit's proxy routes to the LAST mapping for each external port, so
 * 8081, 25497, and 25580 need to forward to the real services.
 */
const net = require("net");

const routes = [
  [8081, 5000],    // external :80  (secondary)  → PWA Vite dev server
  [25497, 3000],   // external :3000 (secondary) → API server
  [25580, 3002],   // external :3002 (secondary) → Admin Portal Vite dev server
];

let started = 0;
for (const [from, to] of routes) {
  const server = net.createServer((src) => {
    const dst = net.connect(to, "127.0.0.1");
    src.pipe(dst);
    dst.pipe(src);
    const cleanup = () => { src.destroy(); dst.destroy(); };
    src.on("error", cleanup);
    dst.on("error", cleanup);
  });

  server.listen(from, "0.0.0.0", () => {
    console.log(`[port-bridge] :${from} → :${to}`);
    started++;
    if (started === routes.length) console.log("[port-bridge] all bridges ready");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[port-bridge] :${from} already in use — skipping`);
    } else {
      console.error(`[port-bridge] :${from} error:`, err.message);
    }
  });
}
