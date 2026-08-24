import { useMemo, useState } from "react";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HYDRO_HOLIDAYS_2026, getHolidayForDate, type HolidayInfo } from "@/data/hydroCalendar2026";
import logoHydro from "@/assets/logo-hydro.png";
import Layout from "@/components/layout/Layout";
import { EditableImage } from "@/components/cms/EditableImage";
import { useEditMode } from "@/contexts/EditModeContext";

const MONTHS_2026 = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1));

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function MonthCalendar({ month }: { month: Date }) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  // Week starts on Monday (weekStartsOn: 1)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="py-2 px-3 bg-primary/10 border-b">
        <CardTitle className="text-sm font-bold text-center uppercase tracking-wider">
          {format(month, "MMMM", { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={`text-[10px] font-semibold text-center py-0.5 ${
                i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0">
            {week.map((d, di) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const holiday = getHolidayForDate(dateStr);
              const inMonth = isSameMonth(d, month);
              const today = isToday(d);
              const isWeekend = di >= 5;

              let bgClass = "";
              let textClass = "text-foreground";

              if (!inMonth) {
                textClass = "text-muted-foreground/30";
              } else if (holiday) {
                if (holiday.type === "feriado") {
                  bgClass = "bg-red-500/20";
                  textClass = "text-red-700 dark:text-red-400 font-bold";
                } else if (holiday.type === "compensado") {
                  bgClass = "bg-amber-500/20";
                  textClass = "text-amber-700 dark:text-amber-400 font-semibold";
                } else if (holiday.type === "carnaval") {
                  bgClass = "bg-purple-500/20";
                  textClass = "text-purple-700 dark:text-purple-400 font-bold";
                }
              } else if (isWeekend) {
                textClass = "text-muted-foreground/50";
              }

              return (
                <div
                  key={di}
                  className={`relative text-center py-1 text-xs rounded-sm ${bgClass} ${
                    today ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                  }`}
                  title={holiday?.label}
                >
                  <span className={textClass}>
                    {inMonth ? format(d, "d") : ""}
                  </span>
                  {holiday && inMonth && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Month holidays list */}
        {(() => {
          const monthHolidays = HYDRO_HOLIDAYS_2026.filter(h => {
            const hDate = new Date(h.date + "T12:00:00");
            return hDate.getMonth() === month.getMonth();
          });
          if (monthHolidays.length === 0) return null;
          return (
            <div className="mt-2 pt-2 border-t border-border/40 space-y-0.5">
              {monthHolidays.map(h => (
                <div key={h.date} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      h.type === "feriado"
                        ? "bg-red-500"
                        : h.type === "compensado"
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {format(new Date(h.date + "T12:00:00"), "dd")} - {h.label}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

export default function CalendarioHydro() {
  const { isEditMode } = useEditMode();
  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <EditableImage
              pageKey="calendario-hydro"
              elementKey="page-logo"
              defaultSrc={logoHydro}
              alt="Hydro"
              className="h-10 md:h-12"
              imgClassName="h-10 md:h-12 object-contain"
              canEdit={isEditMode}
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                <EditablePageTitle pageKey="calendario-hydro" defaultValue="Calendário Projetos Alunorte 2026" className="inline" as="h1" />
              </h1>
              <p className="text-sm text-muted-foreground">Feriados e dias compensados</p>
            </div>
          </div>
          <a href="/CALENDARIO_HYDRO.pdf" download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </a>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-foreground font-medium">Feriado</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-foreground font-medium">Dia Compensado</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-foreground font-medium">Carnaval</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-3 h-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-background" />
            <span className="text-foreground font-medium">Hoje</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS_2026.map((month, i) => (
            <MonthCalendar key={i} month={month} />
          ))}
        </div>

        {/* Footer source */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Fonte: Feriados e compensados - RH Informa - Hydro Alunorte
        </p>
      </div>
    </Layout>
  );
}
