import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NeonAvatarProps {
  src?: string | null;
  name: string;
  frameColor?: string | null;
  neonColor?: string | null;
  frameAnimation?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  xs: {
    outer: 28,
    inner: 24,
    border: 2,
    glow: 5,
    text: "text-[10px]",
  },
  sm: {
    outer: 40,
    inner: 36,
    border: 2,
    glow: 8,
    text: "text-xs",
  },
  md: {
    outer: 56,
    inner: 50,
    border: 3,
    glow: 12,
    text: "text-sm",
  },
  lg: {
    outer: 112,
    inner: 104,
    border: 4,
    glow: 20,
    text: "text-xl",
  },
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const isGradient = (color: string) => color.startsWith("linear-gradient") || color.startsWith("conic-gradient");

// CSS keyframes injected once
const STYLE_ID = "neon-avatar-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes neon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes neon-pulse-border {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes neon-breathe {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.04); filter: brightness(1.3); }
    }
    @keyframes neon-flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    @keyframes neon-rainbow-spin {
      from { filter: hue-rotate(0deg); }
      to { filter: hue-rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

const getFrameAnimationStyle = (animation: string | null | undefined): React.CSSProperties => {
  if (!animation || animation === "none") return {};
  switch (animation) {
    case "spin":
      return { animation: "neon-spin 3s linear infinite" };
    case "spin-slow":
      return { animation: "neon-spin 6s linear infinite" };
    case "pulse":
      return { animation: "neon-pulse-border 2s ease-in-out infinite" };
    case "breathe":
      return { animation: "neon-breathe 3s ease-in-out infinite" };
    case "flash":
      return { animation: "neon-flash 1.5s ease-in-out infinite" };
    case "rainbow":
      return { animation: "neon-rainbow-spin 4s linear infinite" };
    default:
      return {};
  }
};

export const NeonAvatar = ({
  src,
  name,
  frameColor,
  neonColor,
  frameAnimation,
  size = "sm",
  className = "",
}: NeonAvatarProps) => {
  const config = sizeConfig[size];
  const hasFrame = !!frameColor;
  const hasNeon = !!neonColor;

  if (!hasFrame && !hasNeon) {
    return (
      <Avatar
        className={className}
        style={{ width: config.outer, height: config.outer }}
      >
        <AvatarImage 
          src={src || undefined} 
          alt={name} 
          className="object-cover" 
          key={src} // Force re-render when URL changes
        />
        <AvatarFallback className={`bg-primary text-primary-foreground font-bold ${config.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    );
  }

  const neonIsGradient = hasNeon && isGradient(neonColor!);
  const neonShadowColor = hasNeon
    ? neonIsGradient
      ? "rgba(255,255,255,0.5)"
      : neonColor!
    : "transparent";

  const animStyle = getFrameAnimationStyle(frameAnimation);
  // For spin animations, we need a conic-gradient approach
  const usesSpinAnimation = frameAnimation === "spin" || frameAnimation === "spin-slow";

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: config.outer,
        height: config.outer,
      }}
    >
      {/* Neon glow aura */}
      {hasNeon && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            inset: -config.glow / 2,
            background: isGradient(neonColor!) ? neonColor! : undefined,
            backgroundColor: !isGradient(neonColor!) ? neonColor! : undefined,
            opacity: 0.45,
            filter: `blur(${config.glow}px)`,
            animationDuration: "2s",
          }}
        />
      )}

      {/* Frame border with animation */}
      {hasFrame && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isGradient(frameColor!) ? frameColor! : frameColor!,
            boxShadow: hasNeon
              ? `0 0 ${config.glow / 2}px ${neonShadowColor}`
              : undefined,
            ...animStyle,
          }}
        />
      )}

      {/* For spin animations, we add a second spinning highlight layer */}
      {hasFrame && usesSpinAnimation && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.6) 10%, transparent 20%, transparent 100%)`,
            ...animStyle,
          }}
        />
      )}

      {/* Avatar — flush against frame */}
      <Avatar
        className="relative z-10"
        style={{
          width: config.inner,
          height: config.inner,
        }}
      >
        <AvatarImage 
          src={src || undefined} 
          alt={name} 
          className="object-cover" 
          key={src} // Force re-render when URL changes
        />
        <AvatarFallback className={`bg-primary text-primary-foreground font-bold ${config.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
