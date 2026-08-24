import { useMemo } from "react";
import { Mic, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTomorrowDDS } from "@/hooks/useDDSSchedule";
import { useAuth } from "@/hooks/useAuth";
import { getBrazilNorthDate } from "@/lib/timezone";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const DDSPresenterAlert = () => {
  const { user } = useAuth();
  const { data: tomorrowDDS, isLoading } = useTomorrowDDS();
  
  const today = getBrazilNorthDate();
  const tomorrow = addDays(today, 1);
  const tomorrowFormatted = format(tomorrow, "EEEE, dd 'de' MMMM", { locale: ptBR });

  // Check if the current user is the presenter for tomorrow's DDS
  const isUserPresenterTomorrow = useMemo(() => {
    if (!user || !tomorrowDDS) return false;
    return tomorrowDDS.presenter_user_id === user.id;
  }, [user, tomorrowDDS]);

  // Don't render if loading, no data, or user is not the presenter
  if (isLoading || !tomorrowDDS || !isUserPresenterTomorrow) {
    return null;
  }

  return (
    <Card className="relative border-2 border-blue-400/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 overflow-hidden animate-fade-in glass-card-dashboard">
      
      {/* Microphone animation container */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
        <Mic className="w-24 h-24 text-blue-500" />
      </div>

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-blue-500/20 rounded-full animate-pulse">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-blue-700 dark:text-blue-300 font-bold">
            🎤 Atenção! Você é o Palestrante de Amanhã!
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground capitalize">
                {tomorrowFormatted}
              </span>
            </div>
            
            <p className="text-base font-medium text-foreground mb-2">
              Você está escalado para ministrar o DDS de amanhã sobre:
            </p>
            
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {tomorrowDDS.theme}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200 dark:border-blue-800">
            <Mic className="w-8 h-8 text-blue-500" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Prepare-se!</p>
              <p className="text-muted-foreground">Revise o tema com antecedência</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DDSPresenterAlert;
