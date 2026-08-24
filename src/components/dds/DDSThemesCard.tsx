import { useState, useMemo } from "react";
import { format, parse, isWithinInterval, startOfDay } from "date-fns";
import { Calendar, Search, ChevronDown, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ddsThemes2026, DDSWeekTheme } from "@/data/ddsThemes2026";
import { getBrazilNorthDate } from "@/lib/timezone";

interface DDSThemesCardProps {
  selectedDate?: Date;
}

export const DDSThemesCard = ({ selectedDate }: DDSThemesCardProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([]);

  const today = getBrazilNorthDate();

  // Find current week
  const currentWeek = useMemo(() => {
    const todayStr = format(today, "yyyy-MM-dd");
    return ddsThemes2026.find(week => todayStr >= week.inicio && todayStr <= week.fim);
  }, [today]);

  // Filter themes based on search
  const filteredThemes = useMemo(() => {
    if (!searchTerm.trim()) {
      return ddsThemes2026;
    }
    
    const search = searchTerm.toLowerCase();
    return ddsThemes2026.filter(week => 
      week.temas.some(tema => tema.toLowerCase().includes(search)) ||
      week.semanaPromocao?.toLowerCase().includes(search) ||
      week.feriado?.toLowerCase().includes(search) ||
      `semana ${week.semana}`.includes(search)
    );
  }, [searchTerm]);

  // Check if a date falls within a week
  const isDateInWeek = (week: DDSWeekTheme, date: Date) => {
    const start = startOfDay(parse(week.inicio, "yyyy-MM-dd", new Date()));
    const end = startOfDay(parse(week.fim, "yyyy-MM-dd", new Date()));
    return isWithinInterval(startOfDay(date), { start, end });
  };

  // Toggle week expansion
  const toggleWeek = (semana: number) => {
    setExpandedWeeks(prev => 
      prev.includes(semana) 
        ? prev.filter(s => s !== semana)
        : [...prev, semana]
    );
  };

  // Format date range for display
  const formatDateRange = (inicio: string, fim: string) => {
    const startDate = parse(inicio, "yyyy-MM-dd", new Date());
    const endDate = parse(fim, "yyyy-MM-dd", new Date());
    return `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}`;
  };

  return (
    <Card className="glass-card-dashboard">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-amber-500" />
          Temas por Semana
        </CardTitle>
        <CardDescription>
          Consulte os temas programados para cada semana de 2026
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tema, campanha ou feriado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Current Week Highlight */}
        {currentWeek && !searchTerm && (
          <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-800">
                  <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                      Semana Atual - Semana {currentWeek.semana}
                    </h4>
                    <Badge className="bg-amber-500 text-white">
                      {formatDateRange(currentWeek.inicio, currentWeek.fim)}
                    </Badge>
                  </div>
                  {currentWeek.semanaPromocao && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                      🎯 {currentWeek.semanaPromocao}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {currentWeek.temas.map((tema, idx) => (
                      <li key={idx} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {tema}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weeks List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredThemes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum tema encontrado para "{searchTerm}"</p>
              </div>
            ) : (
              filteredThemes.map((week) => {
                const isCurrentWeek = currentWeek?.semana === week.semana;
                const isExpanded = expandedWeeks.includes(week.semana);
                const isSelectedDate = selectedDate && isDateInWeek(week, selectedDate);

                return (
                  <Collapsible
                    key={week.semana}
                    open={isExpanded || isCurrentWeek}
                    onOpenChange={() => toggleWeek(week.semana)}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                          ${isCurrentWeek 
                            ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700" 
                            : isSelectedDate
                              ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700"
                              : "border-border hover:border-muted-foreground/30"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                              ${isCurrentWeek 
                                ? "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200" 
                                : "bg-muted text-muted-foreground"
                              }
                            `}>
                              {week.semana}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  Semana {week.semana}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateRange(week.inicio, week.fim)}
                                </span>
                                {isCurrentWeek && (
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    Atual
                                  </Badge>
                                )}
                              </div>
                              {week.semanaPromocao && (
                                <p className="text-xs text-primary truncate max-w-[300px]">
                                  🎯 {week.semanaPromocao}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {week.feriado && (
                              <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {week.feriado}
                              </Badge>
                            )}
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${(isExpanded || isCurrentWeek) ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 ml-14 p-3 bg-muted/30 rounded-lg border-l-2 border-primary/30">
                        <h5 className="text-sm font-medium mb-2">Temas programados:</h5>
                        <ul className="space-y-1.5">
                          {week.temas.map((tema, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">📋</span>
                              <span>{tema}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
