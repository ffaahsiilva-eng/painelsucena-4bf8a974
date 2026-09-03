import { useState, useEffect, useRef } from "react";
import { User, Cpu, ShieldCheck, Database, Server, Network } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

const DEFAULT_TRANSITION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260620_191000_3d_sphere_nature.mp4";

interface LoginTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
}

export function LoginTransition({ onComplete, userName, userAvatar, userCargo }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"blank" | "logo" | "welcome" | "fade" | "exit" | "done">("blank");
  const [isMounted, setIsMounted] = useState(false);
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const logoUrl = settings.transition_logo_url || settings.logo_url || logoPrincipal;
  const isLogoReady = !isSettingsLoading && !!logoUrl;
  const customMediaUrl = settings.login_transition_media_url || null;
  const isCustomImage = !!customMediaUrl && !/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(customMediaUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEndedRef = useRef(false);
  const visualDoneRef = useRef(false);
  const displayName = userName || "Usuário";

  const tryFinish = () => {
    if (audioEndedRef.current && visualDoneRef.current) {
      setPhase("exit");
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    const audioDay = new Date(now);
    if (now.getHours() < 7) {
      audioDay.setDate(audioDay.getDate() - 1);
    }
    const dayKey = `${audioDay.getFullYear()}-${audioDay.getMonth() + 1}-${audioDay.getDate()}`;
    const storageKey = "login-welcome-audio-last-day";
    const lastPlayedDay = localStorage.getItem(storageKey);

    if (lastPlayedDay === dayKey) {
      audioEndedRef.current = true;
      tryFinish();
      return;
    }

    localStorage.setItem(storageKey, dayKey);

    const audio = new Audio("/sounds/login-welcome.wav");
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    audio.addEventListener("error", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    audio.play().catch(() => {
      audioEndedRef.current = true;
      tryFinish();
    });
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (isLogoReady) setPhase("logo");
    }, 300);
    const t2 = setTimeout(() => setPhase("welcome"), 4500);
    const t3 = setTimeout(() => setPhase("fade"), 6500);
    const t4 = setTimeout(() => {
      setPhase("done");
      visualDoneRef.current = true;
      tryFinish();
    }, 7300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);



  return (
    <div
      className={`fixed inset-0 z-[9999] pointer-events-none overflow-hidden bg-[#010101] flex items-center justify-center perspective-1000 transition-all duration-1000 ease-in-out ${
        !isMounted || phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        ["--logo-dur" as any]: `${settings.login_anim_logo_duration_ms ?? 1400}ms`,
        ["--name-dur" as any]: `${settings.login_anim_name_duration_ms ?? 1100}ms`,
        ["--anim-i" as any]: `${(settings.login_anim_intensity ?? 100) / 100}`,
      }}
    >
      {/* Cinematic background (custom media do admin ou animação padrão) */}
      {customMediaUrl && isCustomImage ? (
        <img
          src={customMediaUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-center"
          src={customMediaUrl || DEFAULT_TRANSITION_VIDEO}
        />
      )}
      {/* Dark overlay for content legibility */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Global background image removed from transition */}

      {/* 3D Grid Background removed */}

      {/* Phase: Logo Initial */}
      {phase === "logo" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <img
            loading="lazy"
            decoding="async"
            src={logoUrl}
            alt="Logo"
            className="h-28 md:h-40 object-contain brightness-125 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-logo-reveal"
          />
        </div>
      )}

      {/* Phase: Welcome (Final Result) */}
      {(phase === "welcome" || phase === "fade") && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
            phase === "fade" ? "animate-soft-exit" : "animate-soft-enter"
          }`}
        >
          {userAvatar ? (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-8 ring-4 ring-white/20 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] animate-logo-reveal">
              <img
                loading="lazy"
                decoding="async"
                src={userAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <img
              loading="lazy"
              decoding="async"
              src={logoUrl}
              alt="Logo"
              className="h-24 md:h-32 object-contain mb-8 brightness-125 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] animate-logo-reveal"
            />
          )}

          <div className="text-center space-y-4">
            <p className="text-blue-400 text-base md:text-lg font-light tracking-[0.5em] uppercase opacity-70 animate-name-rise" style={{ animationDelay: "180ms" }}>
              Acesso Autorizado
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight animate-name-rise" style={{ animationDelay: "340ms" }}>
              {displayName}
            </h1>
            {userCargo && (

              <p className="text-slate-400 text-sm md:text-base font-medium tracking-[0.3em] uppercase pt-2 animate-name-rise" style={{ animationDelay: "520ms" }}>
                {userCargo}
              </p>
            )}
          </div>
        </div>
      )}


      <style>{`
        .perspective-1000 { perspective: 1000px; }

        @keyframes logo-reveal {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .animate-logo-reveal { animation: logo-reveal var(--logo-dur) cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes name-rise {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-name-rise { animation: name-rise var(--name-dur) cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes soft-enter {
          0% { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .animate-soft-enter { animation: soft-enter var(--name-dur) cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes soft-exit {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -55%) scale(1.05); filter: blur(10px); }
        }
        .animate-soft-exit { animation: soft-exit var(--name-dur) cubic-bezier(0.4, 0, 0.2, 1) both; }
      `}</style>
    </div>
  );
}
