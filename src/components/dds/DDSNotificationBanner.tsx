import { useState, useEffect, useMemo } from "react";
import { X, Sun, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SunBorderAvatar } from "./SunBorderAvatar";
import { useTomorrowDDS } from "@/hooks/useDDSSchedule";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthDate, getBrazilNorthTomorrowString } from "@/lib/timezone";
import { useDDSMidnightRefresh } from "@/hooks/useMidnightRefresh";

export const DDSNotificationBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { data: tomorrowDDS, isLoading } = useTomorrowDDS();

  // Hook to refresh DDS data at midnight (00:00 Pará time)
  // Returns a key that changes when midnight occurs, forcing re-render
  const dateKey = useDDSMidnightRefresh();

  // Use Brazil North timezone - recalculate when dateKey changes
  const tomorrowDate = useMemo(() => addDays(getBrazilNorthDate(), 1), [dateKey]);
  const tomorrowStr = useMemo(() => getBrazilNorthTomorrowString(), [dateKey]);
  const storageKey = `dds-notification-${tomorrowStr}`;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  if (isLoading || isDismissed || !tomorrowDDS) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 mb-6 glass-card-dashboard">
      {/* Decorative sun elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 hover:bg-amber-100 dark:hover:bg-amber-900/50"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Animated sun icon */}
          <div className="hidden sm:flex items-center justify-center">
            <div className="relative">
              <Sun className="h-8 w-8 text-amber-500 animate-spin" style={{ animationDuration: "8s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Avatar with sun border */}
          <SunBorderAvatar
            src={tomorrowDDS.presenter?.avatar_url}
            name={tomorrowDDS.presenter?.full_name || "Palestrante"}
            size="lg"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full">
                DDS de Amanhã
              </span>
              <span className="text-sm text-muted-foreground">
                {format(tomorrowDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            <h3 className="text-xl font-bold text-foreground truncate">
              {tomorrowDDS.presenter?.full_name || "Palestrante"}
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              {tomorrowDDS.presenter?.cargo && (
                <span className="capitalize">
                  {tomorrowDDS.presenter.cargo.replace(/_/g, " ")} • 
                </span>
              )}
            </p>

            <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                📋 Tema: <span className="font-bold">{tomorrowDDS.theme}</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
