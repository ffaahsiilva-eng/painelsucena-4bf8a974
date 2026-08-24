import { useRef, type ReactNode, type CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  /** Altura estimada de cada item em pixels (para o cálculo inicial). */
  estimateSize: number;
  /** Altura máxima do container de scroll. */
  height?: number | string;
  /** Renderiza uma linha. Assinatura similar ao map. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Chave estável por item. */
  getKey: (item: T, index: number) => string | number;
  /** Overscan (linhas fora da viewport). Default 8. */
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  /** Habilita medição dinâmica de altura (para itens de altura variável). */
  measureDynamic?: boolean;
}

/**
 * Lista virtualizada baseada em @tanstack/react-virtual.
 *
 * Renderiza apenas as linhas visíveis, mantendo scroll suave e re-renders
 * proporcionais à viewport (não ao total de itens). Ideal para listas com
 * 200+ elementos.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  height = 640,
  renderItem,
  getKey,
  overscan = 8,
  className,
  style,
  measureDynamic = false,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getKey(items[index], index),
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={cn("relative overflow-auto", className)}
      style={{ height, ...style }}
    >
      <div
        style={{
          height: totalSize,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((v) => (
          <div
            key={v.key}
            ref={measureDynamic ? virtualizer.measureElement : undefined}
            data-index={v.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${v.start}px)`,
              ...(measureDynamic ? {} : { height: v.size }),
            }}
          >
            {renderItem(items[v.index], v.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
