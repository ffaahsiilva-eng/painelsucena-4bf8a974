import { useEffect, useRef, useState } from "react";

/**
 * Suavemente anima um número de 0 até `target` durante `duration` ms.
 * Reinicia sempre que o componente monta (recarregar a página) e
 * quando `target` muda. Usa requestAnimationFrame com easing easeOutCubic.
 */
export function useAnimatedNumber(
  target: number,
  duration = 1000,
  decimals = 0,
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(0);
      return;
    }
    // Começa da posição atual para evitar saltos quando o target muda
    fromRef.current = value;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      const factor = Math.pow(10, decimals);
      setValue(Math.round(next * factor) / factor);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, decimals]);

  return value;
}
