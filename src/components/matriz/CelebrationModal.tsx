import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoName: string;
  userName?: string;
  userAvatarUrl?: string;
}

export function CelebrationModal({ isOpen, onClose, cargoName, userName, userAvatarUrl }: CelebrationModalProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      const newSparkles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 3,
      }));
      setSparkles(newSparkles);

      // No auto-close - only closes on X click
    }
  }, [isOpen, onClose]);

  const displayName = userName || "Colaborador";

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none overflow-visible p-0 [&>button]:hidden">
        <div className="relative w-full flex items-center justify-center" style={{ minHeight: 520 }}>
          {/* Background card */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-gray-100 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-2xl p-6 pt-8 flex flex-col items-center">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Sparkles */}
            {sparkles.map((s) => (
              <div
                key={s.id}
                className="absolute text-amber-400 pointer-events-none"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  fontSize: s.size,
                  animation: `sparkle-float 2s ease-in-out ${s.delay}s infinite alternate`,
                  opacity: 0.7,
                }}
              >
                ✦
              </div>
            ))}

            {/* Gold star balloons - decorative */}
            <div className="absolute -top-2 -right-2 text-5xl" style={{ animation: "balloon-float 3s ease-in-out infinite alternate" }}>
              ⭐
            </div>
            <div className="absolute top-8 -right-4 text-4xl" style={{ animation: "balloon-float 3s ease-in-out 0.5s infinite alternate" }}>
              🌟
            </div>
            <div className="absolute top-20 -right-1 text-3xl" style={{ animation: "balloon-float 3s ease-in-out 1s infinite alternate" }}>
              ⭐
            </div>
            <div className="absolute -top-1 -left-3 text-3xl" style={{ animation: "balloon-float 3s ease-in-out 0.7s infinite alternate" }}>
              🌟
            </div>
            <div className="absolute top-16 -left-4 text-4xl" style={{ animation: "balloon-float 3s ease-in-out 1.2s infinite alternate" }}>
              ⭐
            </div>

            {/* Gold balloons */}
            <div className="absolute bottom-24 -right-3 text-4xl" style={{ animation: "balloon-float 2.5s ease-in-out 0.3s infinite alternate" }}>
              🎈
            </div>
            <div className="absolute bottom-16 -left-2 text-3xl" style={{ animation: "balloon-float 2.5s ease-in-out 0.8s infinite alternate" }}>
              🎈
            </div>

            {/* Profile Photo */}
            <div 
              className="relative z-10 mb-4"
              style={{ animation: "photo-appear 0.8s ease-out forwards" }}
            >
              <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-700 bg-gray-200">
                {userAvatarUrl ? (
                  <img loading="lazy" decoding="async" 
                    src={userAvatarUrl} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-white text-5xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Parabéns title */}
            <h2 
              className="text-5xl mb-1 z-10"
              style={{
                fontFamily: "'Dancing Script', 'Georgia', cursive",
                background: "linear-gradient(135deg, #D4A017, #FFD700, #B8860B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                animation: "title-appear 0.6s ease-out 0.3s both",
                fontWeight: 700,
              }}
            >
              Parabéns
            </h2>

            {/* Cargo name */}
            <p 
              className="text-base font-semibold text-foreground z-10 mb-3"
              style={{ animation: "title-appear 0.6s ease-out 0.5s both" }}
            >
              ✦ {cargoName}
            </p>

            {/* Message card */}
            <div 
              className="relative z-10 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg w-full border border-gray-100 dark:border-gray-700"
              style={{ animation: "message-slide 0.6s ease-out 0.7s both" }}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-semibold text-foreground">Matriz Concluída</span>
                <span className="text-amber-500">★★★★★</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Que conquista incrível! Você completou todas as atividades da Matriz desse mês. 
                Continue com esse comprometimento exemplar!
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{cargoName}</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">100% ✓</span>
              </div>
            </div>

            {/* Confetti emoji decorations */}
            <div className="absolute top-2 left-1/4 text-xl" style={{ animation: "confetti-fall 2s ease-in 0s infinite" }}>🎊</div>
            <div className="absolute top-0 right-1/4 text-xl" style={{ animation: "confetti-fall 2s ease-in 0.5s infinite" }}>🎉</div>
          </div>
        </div>

        <style>{`
          @keyframes photo-appear {
            0% { transform: scale(0.5) translateY(30px); opacity: 0; }
            60% { transform: scale(1.05) translateY(-5px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }

          @keyframes title-appear {
            0% { transform: translateY(15px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          @keyframes message-slide {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          @keyframes balloon-float {
            0% { transform: translateY(0) rotate(-3deg); }
            100% { transform: translateY(-12px) rotate(3deg); }
          }

          @keyframes sparkle-float {
            0% { transform: translateY(0) scale(1); opacity: 0.4; }
            100% { transform: translateY(-8px) scale(1.3); opacity: 1; }
          }

          @keyframes confetti-fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(30px) rotate(180deg); opacity: 0; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
