import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export interface HalfGaugeProps {
  /** Percentage filled (0-100). */
  percentage: number;
  /** Outer width/diameter of the arc in px. Default 80. */
  size?: number;
  /** Stroke thickness of the arc in px. Default 8. */
  stroke?: number;
  /** Foreground stroke color (any valid CSS color, including hsl(...)). Default green. */
  color?: string;
  /** Background track color. Default uses --muted token. */
  trackColor?: string;
  /** Animate from 0 to value on mount. Default true. */
  animate?: boolean;
  /** Optional className for the outer wrapper. */
  className?: string;
}

/**
 * Reusable half-circle gauge.
 *
 * The SVG includes extra padding around the arc so that the rounded stroke
 * caps are never clipped by the parent container or card borders.
 */
export function HalfGauge({
  percentage,
  size = 80,
  stroke = 8,
  color,
  trackColor = "hsl(var(--muted))",
  animate = true,
  className,
}: HalfGaugeProps) {
  // Cor dinâmica conforme a porcentagem (paleta dourada)
  const dynamicColor =
    color ??
    (percentage >= 70
      ? "hsl(var(--primary))"
      : percentage >= 40
      ? "hsl(var(--primary) / 0.75)"
      : "hsl(var(--destructive))");
  const animated = useAnimatedNumber(animate ? percentage : percentage, animate ? 10000 : 0);

  const pad = stroke; // breathing room so the rounded caps aren't clipped
  const width = size + pad * 2;
  const height = size / 2 + pad * 2;
  const cx = width / 2;
  const cy = pad + size / 2;
  const r = (size - stroke) / 2;
  const c = r * Math.PI; // half circumference
  const clamped = Math.max(0, Math.min(100, animated));
  const dash = (clamped / 100) * c;

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div
      className={`relative shrink-0 ${className ?? ""}`}
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <path
          d={arc}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={arc}
          fill="none"
          stroke={dynamicColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke 0.6s ease-out" }}
        />
      </svg>
    </div>
  );
}

export default HalfGauge;
