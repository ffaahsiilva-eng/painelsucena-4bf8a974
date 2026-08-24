import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";
import { toast } from "sonner";

const STORAGE_KEY = "friday-notification-shown";

export function useFridayNotification() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const now = getBrazilNorthDate();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri

    if (dayOfWeek !== 5) return;

    const todayStr = getBrazilNorthTodayString();
    const shown = localStorage.getItem(STORAGE_KEY);
    if (shown === todayStr) return;

    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, todayStr);

      toast.info("🎉 Sextou! Hoje a atenção é redobrada!", {
        duration: 15000,
        id: "friday-notification",
        description:
          "Nada de correria — segurança em primeiro lugar! Tenha um ótimo fim de semana com quem você ama! 🛡️❤️",
        style: {
          background: "hsl(var(--primary) / 0.1)",
          border: "1px solid hsl(var(--primary) / 0.3)",
        },
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [user]);
}
