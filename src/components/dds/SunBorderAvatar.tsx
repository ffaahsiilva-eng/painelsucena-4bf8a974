import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SunBorderAvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: {
    container: "w-12 h-12",
    avatar: "w-10 h-10",
    text: "text-sm",
  },
  md: {
    container: "w-20 h-20",
    avatar: "w-16 h-16",
    text: "text-lg",
  },
  lg: {
    container: "w-28 h-28",
    avatar: "w-24 h-24",
    text: "text-xl",
  },
  xl: {
    container: "w-36 h-36",
    avatar: "w-32 h-32",
    text: "text-2xl",
  },
};

export const SunBorderAvatar = ({ src, name, size = "lg" }: SunBorderAvatarProps) => {
  const sizes = sizeClasses[size];

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative ${sizes.container} flex items-center justify-center`}>
      {/* Animated sun border */}
      <div
        className={`absolute inset-0 rounded-full animate-spin`}
        style={{
          background: `conic-gradient(
            from 0deg,
            #fbbf24,
            #f59e0b,
            #fbbf24,
            #fcd34d,
            #fbbf24,
            #f59e0b,
            #fbbf24
          )`,
          animationDuration: "3s",
        }}
      />
      
      {/* Sun rays */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, transparent 60%, rgba(251, 191, 36, 0.3) 70%, transparent 80%)`,
          animationDuration: "2s",
        }}
      />

      {/* Inner circle background */}
      <div
        className={`absolute rounded-full bg-background`}
        style={{
          width: `calc(100% - 6px)`,
          height: `calc(100% - 6px)`,
        }}
      />

      {/* Avatar */}
      <Avatar className={`${sizes.avatar} relative z-10 border-2 border-amber-200`}>
        <AvatarImage src={src || undefined} alt={name} className="object-cover" />
        <AvatarFallback className={`bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold ${sizes.text}`}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
