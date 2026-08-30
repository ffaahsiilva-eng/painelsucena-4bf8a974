/**
 * Prefetch das rotas principais essenciais.
 * Respeita conexões lentas e modo economia de dados (Save-Data).
 * Executa em `requestIdleCallback` com intervalo suave para não degradar a CPU/rede.
 */

const essentialLoaders: Array<() => Promise<unknown>> = [
  () => import("@/pages/Index"),
  () => import("@/pages/Lembretes"),
  () => import("@/pages/InstaCena"),
  () => import("@/pages/Equipamentos"),
  () => import("@/pages/RH"),
];

let started = false;

export function prefetchMainRoutes() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Respeita modo economia de dados e conexões 2G/3G lentas
  const nav = navigator as any;
  if (nav.connection?.saveData) return;
  if (nav.connection?.effectiveType && ["slow-2g", "2g"].includes(nav.connection.effectiveType)) {
    return;
  }

  const idle: (cb: () => void) => void =
    "requestIdleCallback" in window
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 6000 })
      : (cb) => setTimeout(cb, 3500);

  let i = 0;
  const runNext = () => {
    if (i >= essentialLoaders.length) return;
    const load = essentialLoaders[i++];
    load()
      .catch(() => {/* silencioso: prefetch é best-effort */})
      .finally(() => setTimeout(() => idle(runNext), 1000));
  };

  idle(runNext);
}

