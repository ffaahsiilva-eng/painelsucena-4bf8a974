import { useEffect } from "react";
import { getUpcomingHoliday } from "@/data/hydroCalendar2026";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STORAGE_KEY = "holiday-notification-shown";

export function useHolidayNotification() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const result = getUpcomingHoliday();
    if (!result) return;

    const { holiday, daysAhead } = result;
    const storageValue = `${holiday.date}-${daysAhead}`;

    // Only show once per holiday+day combo
    const shown = localStorage.getItem(STORAGE_KEY);
    if (shown === storageValue) return;

    const message = daysAhead === 1
      ? `🎉 Amanhã é ${holiday.label}! Aproveite o feriado e descanse bem! 🥳`
      : `🎉 Segunda-feira é ${holiday.label}! Bom fim de semana prolongado! 🥳`;

    // Show notification after a short delay so UI is ready
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, storageValue);

      toast.info(message, {
        duration: 15000,
        id: "holiday-notification",
        description: daysAhead === 1
          ? "Curta o feriado com quem você ama! ❤️"
          : `${holiday.label} — aproveite o descanso! ❤️`,
        style: {
          background: "hsl(var(--primary) / 0.1)",
          border: "1px solid hsl(var(--primary) / 0.3)",
        },
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);
}
