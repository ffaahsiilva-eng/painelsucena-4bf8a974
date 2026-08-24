import { useState, useEffect, useCallback } from "react";

const AnimatedTree = () => {
  const [phase, setPhase] = useState(0); // 0-5 phases
  const [isHovered, setIsHovered] = useState(false);
  const [windOffset, setWindOffset] = useState(0);

  useEffect(() => {
    const interval = isHovered ? 400 : 900;
    if (phase < 5) {
      const timer = setTimeout(() => setPhase((p) => p + 1), interval);
      return () => clearTimeout(timer);
    }
  }, [phase, isHovered]);

  // Gentle wind sway after complete
  useEffect(() => {
    if (phase < 5) return;
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      setWindOffset(Math.sin(elapsed * 1.2) * 2);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleClick = useCallback(() => {
    setPhase(0);
  }, []);

  const drawProgress = (phaseTarget: number, duration: string = "1.5s") => ({
    strokeDasharray: "1000",
    strokeDashoffset: phase >= phaseTarget ? "0" : "1000",
    transition: `stroke-dashoffset ${duration} ease-in-out, opacity 0.5s ease`,
    opacity: phase >= phaseTarget ? 1 : 0,
  });

  const leafStyle = (delay: string) => ({
    opacity: phase >= 3 ? 1 : 0,
    transform: phase >= 3
      ? `scale(1) rotate(${windOffset * 0.5}deg)`
      : "scale(0)",
    transition: `opacity 0.8s ease ${delay}, transform 0.8s ease ${delay}`,
    transformOrigin: "center",
  });

  const fruitStyle = (delay: string) => ({
    opacity: phase >= 4 ? 1 : 0,
    transform: phase >= 4 ? "scale(1)" : "scale(0)",
    transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
  });

  return (
    <div
      className="relative cursor-pointer select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title="Clique para reiniciar"
    >
      <svg
        viewBox="0 0 200 260"
        className="h-28 sm:h-36 w-auto"
        style={{
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
        }}
      >
        {/* Ground line */}
        <line
          x1="30" y1="200" x2="170" y2="200"
          stroke="hsl(35, 30%, 75%)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={drawProgress(0, "1s")}
        />

        {/* === PHASE 0: ROOTS === */}
        <g style={{ transform: `translateX(${windOffset * 0.1}px)` }}>
          {/* Main root center */}
          <path
            d="M100 200 Q100 215 95 225 Q90 235 85 240"
            fill="none"
            stroke="hsl(25, 35%, 45%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={drawProgress(0, "1.2s")}
          />
          {/* Root left */}
          <path
            d="M100 200 Q90 210 75 220 Q65 228 55 232"
            fill="none"
            stroke="hsl(25, 35%, 50%)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={drawProgress(0, "1.4s")}
          />
          {/* Root right */}
          <path
            d="M100 200 Q110 210 125 218 Q135 225 145 230"
            fill="none"
            stroke="hsl(25, 35%, 50%)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={drawProgress(0, "1.6s")}
          />
          {/* Small root tendrils */}
          <path
            d="M85 240 Q80 245 72 248"
            fill="none"
            stroke="hsl(25, 30%, 55%)"
            strokeWidth="1"
            strokeLinecap="round"
            style={drawProgress(0, "1.8s")}
          />
          <path
            d="M145 230 Q150 234 155 236"
            fill="none"
            stroke="hsl(25, 30%, 55%)"
            strokeWidth="1"
            strokeLinecap="round"
            style={drawProgress(0, "1.8s")}
          />
        </g>

        {/* === PHASE 1: TRUNK === */}
        <g style={{ transform: `translate(${windOffset * 0.15}px, 0)` }}>
          <path
            d="M100 200 Q99 180 100 160 Q101 140 100 120"
            fill="none"
            stroke="hsl(25, 35%, 40%)"
            strokeWidth="4"
            strokeLinecap="round"
            style={drawProgress(1, "1.5s")}
          />
          {/* Trunk detail */}
          <path
            d="M98 185 Q97 175 98 165"
            fill="none"
            stroke="hsl(25, 30%, 35%)"
            strokeWidth="1"
            strokeLinecap="round"
            style={{
              ...drawProgress(1, "1.8s"),
              opacity: phase >= 1 ? 0.3 : 0,
            }}
          />
        </g>

        {/* === PHASE 2: BRANCHES === */}
        <g style={{ transform: `translate(${windOffset * 0.3}px, 0)`, transition: "transform 0.3s ease" }}>
          {/* Main left branch */}
          <path
            d="M100 150 Q85 140 65 125 Q55 118 45 112"
            fill="none"
            stroke="hsl(25, 35%, 42%)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={drawProgress(2, "1.2s")}
          />
          {/* Main right branch */}
          <path
            d="M100 145 Q115 135 135 122 Q145 115 155 110"
            fill="none"
            stroke="hsl(25, 35%, 42%)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={drawProgress(2, "1.3s")}
          />
          {/* Upper left */}
          <path
            d="M100 130 Q88 118 72 105 Q62 97 55 90"
            fill="none"
            stroke="hsl(25, 35%, 45%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={drawProgress(2, "1.4s")}
          />
          {/* Upper right */}
          <path
            d="M100 125 Q112 112 130 100 Q140 92 148 85"
            fill="none"
            stroke="hsl(25, 35%, 45%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={drawProgress(2, "1.5s")}
          />
          {/* Top branch */}
          <path
            d="M100 120 Q100 100 100 80 Q100 68 100 60"
            fill="none"
            stroke="hsl(25, 35%, 44%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={drawProgress(2, "1.6s")}
          />
          {/* Small sub-branches */}
          <path
            d="M65 125 Q58 118 50 125"
            fill="none"
            stroke="hsl(25, 30%, 50%)"
            strokeWidth="1.2"
            strokeLinecap="round"
            style={drawProgress(2, "1.7s")}
          />
          <path
            d="M135 122 Q142 115 150 120"
            fill="none"
            stroke="hsl(25, 30%, 50%)"
            strokeWidth="1.2"
            strokeLinecap="round"
            style={drawProgress(2, "1.7s")}
          />
          <path
            d="M72 105 Q65 95 58 98"
            fill="none"
            stroke="hsl(25, 30%, 50%)"
            strokeWidth="1"
            strokeLinecap="round"
            style={drawProgress(2, "1.8s")}
          />
          <path
            d="M130 100 Q138 92 145 95"
            fill="none"
            stroke="hsl(25, 30%, 50%)"
            strokeWidth="1"
            strokeLinecap="round"
            style={drawProgress(2, "1.8s")}
          />
        </g>

        {/* === PHASE 3: LEAVES === */}
        <g style={{ transform: `translate(${windOffset * 0.4}px, 0)`, transition: "transform 0.2s ease" }}>
          {/* Leaf clusters - using ellipses for organic feel */}
          {[
            { cx: 42, cy: 108, rx: 12, ry: 8, delay: "0s", color: "hsl(120, 45%, 45%)" },
            { cx: 50, cy: 120, rx: 10, ry: 7, delay: "0.1s", color: "hsl(130, 50%, 50%)" },
            { cx: 155, cy: 106, rx: 12, ry: 8, delay: "0.15s", color: "hsl(125, 45%, 48%)" },
            { cx: 150, cy: 118, rx: 10, ry: 7, delay: "0.2s", color: "hsl(135, 50%, 52%)" },
            { cx: 52, cy: 86, rx: 14, ry: 10, delay: "0.25s", color: "hsl(118, 48%, 42%)" },
            { cx: 148, cy: 82, rx: 14, ry: 10, delay: "0.3s", color: "hsl(122, 48%, 44%)" },
            { cx: 56, cy: 94, rx: 11, ry: 8, delay: "0.35s", color: "hsl(128, 45%, 46%)" },
            { cx: 145, cy: 92, rx: 11, ry: 8, delay: "0.4s", color: "hsl(132, 45%, 50%)" },
            { cx: 100, cy: 55, rx: 15, ry: 10, delay: "0.35s", color: "hsl(115, 50%, 40%)" },
            { cx: 90, cy: 65, rx: 12, ry: 9, delay: "0.4s", color: "hsl(125, 48%, 45%)" },
            { cx: 110, cy: 62, rx: 12, ry: 9, delay: "0.45s", color: "hsl(120, 48%, 43%)" },
            { cx: 75, cy: 95, rx: 10, ry: 7, delay: "0.5s", color: "hsl(130, 42%, 48%)" },
            { cx: 125, cy: 93, rx: 10, ry: 7, delay: "0.5s", color: "hsl(126, 42%, 46%)" },
            { cx: 65, cy: 75, rx: 8, ry: 6, delay: "0.55s", color: "hsl(135, 40%, 52%)" },
            { cx: 135, cy: 73, rx: 8, ry: 6, delay: "0.55s", color: "hsl(122, 40%, 50%)" },
          ].map((leaf, i) => (
            <ellipse
              key={`leaf-${i}`}
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.rx}
              ry={leaf.ry}
              fill={leaf.color}
              style={leafStyle(leaf.delay)}
            />
          ))}
        </g>

        {/* === PHASE 4: FRUITS === */}
        <g style={{ transform: `translate(${windOffset * 0.35}px, 0)`, transition: "transform 0.25s ease" }}>
          {[
            { cx: 48, cy: 115, r: 3.5, delay: "0s", color: "hsl(0, 70%, 55%)" },
            { cx: 152, cy: 112, r: 3.5, delay: "0.15s", color: "hsl(35, 85%, 55%)" },
            { cx: 58, cy: 88, r: 3, delay: "0.3s", color: "hsl(0, 65%, 50%)" },
            { cx: 140, cy: 86, r: 3, delay: "0.4s", color: "hsl(45, 90%, 55%)" },
            { cx: 95, cy: 58, r: 3.5, delay: "0.5s", color: "hsl(10, 75%, 52%)" },
            { cx: 108, cy: 65, r: 3, delay: "0.6s", color: "hsl(35, 80%, 50%)" },
            { cx: 70, cy: 100, r: 2.5, delay: "0.5s", color: "hsl(0, 60%, 55%)" },
            { cx: 130, cy: 97, r: 2.5, delay: "0.55s", color: "hsl(40, 85%, 52%)" },
          ].map((fruit, i) => (
            <circle
              key={`fruit-${i}`}
              cx={fruit.cx}
              cy={fruit.cy}
              r={fruit.r}
              fill={fruit.color}
              style={fruitStyle(fruit.delay)}
            />
          ))}
        </g>

        {/* === PHASE 5: Subtle glow / completion sparkle === */}
        {phase >= 5 && (
          <g opacity="0.4">
            <circle cx="100" cy="80" r="50" fill="url(#glowGrad)" style={{ opacity: 0.3 }}>
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        <defs>
          <radialGradient id="glowGrad">
            <stop offset="0%" stopColor="hsl(50, 80%, 70%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(50, 80%, 70%)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default AnimatedTree;
