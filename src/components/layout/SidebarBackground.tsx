import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * 0.25,
  }));
}

interface SidebarBackgroundProps {
  animation?: string;
  bgColor?: string;
  particleColors?: string[];
}

function isLightColor(color?: string): boolean {
  if (!color) return false;
  
  // Handle common color names or hex
  if (color === "white" || color === "#ffffff" || color === "#fff") return true;
  if (color === "black" || color === "#000000" || color === "#000") return false;

  const match = color.match(/hsl\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*([\d.]+)%?\s*\)/);
  if (match) return parseFloat(match[1]) > 50;
  return false;
}

// Shape configs per animation type
function getShapeStyle(animation: string, size: number): React.CSSProperties {
  switch (animation) {
    case "stars":
      return {
        width: `${size * 2.5}px`,
        height: `${size * 2.5}px`,
        clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        borderRadius: "0",
      };
    case "rain":
      return {
        width: `${size * 0.6}px`,
        height: `${size * 2.5}px`,
        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
        clipPath: "none",
      };
    case "snow":
      return {
        width: `${size * 2}px`,
        height: `${size * 2}px`,
        borderRadius: "50%",
        clipPath: "none",
        boxShadow: "inset 0 0 2px rgba(255,255,255,0.3)",
      };
    case "fireflies":
      return {
        width: `${size * 1.5}px`,
        height: `${size * 1.5}px`,
        borderRadius: "50%",
        clipPath: "none",
        filter: "blur(0.5px)",
      };
    case "matrix":
      return {
        width: `${size * 0.8}px`,
        height: `${size * 2}px`,
        borderRadius: "1px",
        clipPath: "none",
      };
    default: // particles
      return {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
      };
  }
}

export function SidebarBackground({ animation = "particles", bgColor, particleColors }: SidebarBackgroundProps) {
  const particles = useMemo(() => generateParticles(40), []);
  const light = isLightColor(bgColor);

  if (animation === "none") {
    return null;
  }

  const animationClass = `animate-sidebar-${animation}`;
  
  // Use custom colors if provided, otherwise fallback to defaults
  const getParticleColor = (index: number) => {
    if (particleColors && particleColors.length > 0) {
      return particleColors[index % particleColors.length];
    }

    if (light) {
      return {
        particles: "rgba(0,0,0,0.15)",
        stars: "rgba(217,119,6,0.3)",
        rain: "rgba(37,99,235,0.25)",
        fireflies: "rgba(249,115,22,0.4)",
        snow: "rgba(107,114,128,0.25)",
        matrix: "rgba(21,128,61,0.35)",
      }[animation] || "rgba(0,0,0,0.15)";
    }

    return {
      particles: "rgba(255,255,255,0.2)",
      stars: "rgba(254,240,138,0.4)",
      rain: "rgba(147,197,253,0.3)",
      fireflies: "rgba(252,211,77,0.5)",
      snow: "rgba(255,255,255,0.4)",
      matrix: "rgba(74,222,128,0.4)",
    }[animation] || "rgba(255,255,255,0.2)";
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {particles.map((particle, index) => {
        const shapeStyle = getShapeStyle(animation, particle.size);
        const color = getParticleColor(index);
        
        return (
          <div
            key={particle.id}
            className={`absolute ${animationClass}`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              backgroundColor: color,
              ...shapeStyle,
            }}
          />
        );
      })}

      {/* Animation keyframes */}
      <style>{`
        @keyframes sidebar-particles {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(5px); }
          50% { transform: translateY(-8px) translateX(-3px); }
          75% { transform: translateY(-20px) translateX(3px); }
        }
        .animate-sidebar-particles { animation: sidebar-particles ease-in-out infinite; }

        @keyframes sidebar-stars {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.1; }
          50% { transform: scale(1.8) rotate(36deg); opacity: 0.6; }
        }
        .animate-sidebar-stars { animation: sidebar-stars ease-in-out infinite; }

        @keyframes sidebar-rain {
          0% { transform: translateY(-10px); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-sidebar-rain { animation: sidebar-rain linear infinite; }

        @keyframes sidebar-fireflies {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; box-shadow: 0 0 2px 1px rgba(255,180,0,0.3); }
          25% { transform: translate(10px, -15px) scale(1.5); opacity: 0.7; box-shadow: 0 0 6px 3px rgba(255,180,0,0.5); }
          50% { transform: translate(-5px, -25px) scale(0.8); opacity: 0.4; box-shadow: 0 0 3px 1px rgba(255,180,0,0.2); }
          75% { transform: translate(8px, -10px) scale(1.3); opacity: 0.8; box-shadow: 0 0 8px 4px rgba(255,180,0,0.6); }
        }
        .animate-sidebar-fireflies { animation: sidebar-fireflies ease-in-out infinite; }

        @keyframes sidebar-snow {
          0% { transform: translateY(-5px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
        }
        .animate-sidebar-snow { animation: sidebar-snow linear infinite; }

        @keyframes sidebar-matrix {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.3; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-sidebar-matrix { animation: sidebar-matrix linear infinite; }
      `}</style>
    </div>
  );
}
