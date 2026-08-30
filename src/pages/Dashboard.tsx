import React, { lazy, Suspense, useState, useMemo, useId } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  CloudSun,
  Droplets,
  MapPin,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import "./dashboard-glass-reference.css";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useAttendanceAreaAssignments } from "@/hooks/useAttendanceAreaAssignments";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentTemperature } from "@/hooks/useCurrentTemperature";
import { usePlanejamentoMetas } from "@/hooks/usePlanejamentoMetas";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

// Seções completas do dashboard original, mantidas com dados e ações reais.
// O visual é atualizado pelo escopo .dgv4-extended no CSS deste dashboard.
const ReminderHighlightBanner = lazy(() => import("@/components/reminders/ReminderHighlightBanner").then(m => ({ default: m.ReminderHighlightBanner })));
const BirthdayBanner = lazy(() => import("@/components/dashboard/BirthdayBanner"));
const ASOExpiryBanner = lazy(() => import("@/components/dashboard/ASOExpiryBanner").then(m => ({ default: m.ASOExpiryBanner })));
const MatrixAlertBanner = lazy(() => import("@/components/dashboard/MatrixAlertBanner").then(m => ({ default: m.MatrixAlertBanner })));
const DDSHighlightCard = lazy(() => import("@/components/dds/DDSHighlightCard").then(m => ({ default: m.DDSHighlightCard })));
const CampaignBanner = lazy(() => import("@/components/campaigns/CampaignBanner").then(m => ({ default: m.CampaignBanner })));
const EquipmentStatusCard = lazy(() => import("@/components/dashboard/EquipmentStatusCard").then(m => ({ default: m.EquipmentStatusCard })));
const RecentActivitiesCard = lazy(() => import("@/components/dashboard/RecentActivitiesCard").then(m => ({ default: m.RecentActivitiesCard })));
const AttendanceTrendChart = lazy(() => import("@/components/dashboard/AttendanceTrendChart").then(m => ({ default: m.AttendanceTrendChart })));
const MatrixGauge = lazy(() => import("@/components/dashboard/MatrixGauge").then(m => ({ default: m.MatrixGauge })));
const AtaContratoProgressCard = lazy(() => import("@/components/dashboard/AtaContratoProgressCard").then(m => ({ default: m.AtaContratoProgressCard })));
const MatrixSideChart = lazy(() => import("@/components/dashboard/MatrixSideChart").then(m => ({ default: m.MatrixSideChart })));

const ExtendedSectionSkeleton = () => (
  <div className="dgv4-extended-skeleton" aria-hidden="true">
    <span />
    <span />
    <span />
  </div>
);

type DashboardGlassData = {
  location?: string;
  temperature?: number | string;
  weatherLabel?: string;
  feelsLike?: number | string;
  humidity?: number | string;
  wind?: number | string;
  employees?: number | string;
  progress?: number;
  goalsTotal?: number;
  goalsDone?: number;
  goalsRemaining?: number;
  present?: number | string;
  absences?: number | string;
  external?: number | string;
  equipmentPercent?: number;
  equipmentActive?: number;
  equipmentTotal?: number;
  dateLabel?: string;
};

type Props = {
  data?: DashboardGlassData;
};

function Ring({
  value = 0,
  label,
  size = 164,
}: {
  value?: number;
  label: string;
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const animatedPct = useAnimatedNumber(pct, 1500);
  const offset = c - (animatedPct / 100) * c;
  const gradientId = useId();

  return (
    <div className="dgv4-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0%" stopColor="#a98247" />
            <stop offset="100%" stopColor="#d8b36e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(59,62,64,.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dgv4-ring-center">
        <strong>{animatedPct}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MiniLine({ variant = 1 }: { variant?: number }) {
  const path =
    variant === 1
      ? "M0 62 C30 35,52 58,78 42 S126 15,156 35 S202 10,246 35"
      : "M0 68 C35 52,52 70,78 42 S120 26,145 45 S185 10,220 30 S238 58,246 64";
  return (
    <svg className="dgv4-mini-svg" viewBox="0 0 246 82" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(181,138,72,.18)" />
          <stop offset="100%" stopColor="rgba(181,138,72,0)" />
        </linearGradient>
      </defs>
      <path d={`${path} L246 82 L0 82 Z`} fill={`url(#area-${variant})`} />
      <path d={path} fill="none" stroke="#a98146" strokeWidth="1.5" />
    </svg>
  );
}

function MiniBars() {
  const heights = [32, 24, 46, 34, 68, 17, 28];
  return (
    <div className="dgv4-bars">
      {heights.map((h, i) => (
        <span key={i} style={{ height: h }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const todayString = getBrazilNorthTodayString();
  const [selectedDate] = useState<Date>(() => {
    const [y, m, d] = todayString.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");

  const { data: rhData } = useRHEfetivo();
  const { data: dailyMarks } = useAttendanceDailyMarks(selectedDateString);
  const { data: areaAssignments } = useAttendanceAreaAssignments();
  const { data: equipment } = useEquipment();
  const { data: currentlyOutEquipment } = useEquipmentCurrentlyOut();
  const { data: jardinagemEquipment } = useJardinagemEquipment();
  const { data: currentWeather } = useCurrentTemperature(true);
  const { data: planejamentoMetas = [] } = usePlanejamentoMetas();

  const activeColaboradores = useMemo(() => {
    if (!rhData?.colaboradores) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores.filter(c => !deletedIds.includes(c.id));
  }, [rhData]);

  const totalEmployees = activeColaboradores.length;

  const savedAreasToday = useMemo(() => {
    const set = new Set<string>();
    (dailyMarks ?? []).forEach((m) => set.add(m.area));
    return set;
  }, [dailyMarks]);

  const expectedToday = useMemo(() => {
    if (!areaAssignments || savedAreasToday.size === 0) return 0;
    const activeIds = new Set(activeColaboradores.map((c) => c.id));
    return areaAssignments.filter(
      (a) => activeIds.has(a.employee_id) && savedAreasToday.has(a.area)
    ).length;
  }, [areaAssignments, activeColaboradores, savedAreasToday]);

  const absentToday = useMemo(() => {
    if (!dailyMarks) return 0;
    const allAbsentIds = new Set<number>();
    dailyMarks.forEach((m) => {
      (m.absent_employee_ids || []).forEach((id) => allAbsentIds.add(Number(id)));
    });
    const activeIds = new Set(activeColaboradores.map((c) => c.id));
    let count = 0;
    allAbsentIds.forEach((id) => {
      if (activeIds.has(id)) count++;
    });
    return count;
  }, [dailyMarks, activeColaboradores]);

  const { data: externalToday = 0 } = useQuery({
    queryKey: ["external_work_count_all_areas", selectedDateString],
    queryFn: async () => {
      const ids = new Set<string>();
      const { data: marks } = await supabase
        .from("attendance_daily_marks")
        .select("external_work_employee_ids")
        .eq("date", selectedDateString);
      (marks || []).forEach((m: any) => {
        (m.external_work_employee_ids || []).forEach((id: any) => ids.add(String(id)));
      });
      const { data: rh } = await supabase
        .from("attendance_absence_reasons")
        .select("employee_id")
        .eq("date", selectedDateString)
        .eq("reason", "Trabalho Externo");
      (rh || []).forEach((r: any) => ids.add(String(r.employee_id)));
      return ids.size;
    },
  });

  const presentToday = savedAreasToday.size === 0 ? 0 : Math.max(0, expectedToday - absentToday);

  const planejamentoSummary = useMemo(() => {
    const metas = planejamentoMetas.filter((m) => !m.is_section_header);
    const goalsTotal = metas.length;
    const goalsDone = metas.filter((m) => Number(m.meta) > 0 && Number(m.realizado) >= Number(m.meta)).length;
    const goalsRemaining = Math.max(0, goalsTotal - goalsDone);
    const totalMeta = metas.reduce((sum, m) => sum + Math.max(0, Number(m.meta) || 0), 0);
    const totalRealizado = metas.reduce((sum, m) => {
      const meta = Math.max(0, Number(m.meta) || 0);
      const realizado = Math.max(0, Number(m.realizado) || 0);
      return sum + (meta > 0 ? Math.min(realizado, meta) : 0);
    }, 0);
    const progress = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;
    return { goalsTotal, goalsDone, goalsRemaining, progress };
  }, [planejamentoMetas]);

  const jardinagemTotal = jardinagemEquipment?.length || 0;
  const jardinagemIn = jardinagemEquipment?.filter(e => e.status === "entrou").length || 0;
  const vehiclePlates = new Set((equipment || []).map(e => e.plate));
  const vehiclesOut = (currentlyOutEquipment || []).filter(m => vehiclePlates.has(m.plate)).length;
  const vehiclesIn = (equipment || []).length - vehiclesOut;
  const inOperation = vehiclesIn + jardinagemIn;
  const totalEquip = (equipment?.length || 0) + jardinagemTotal;
  const equipPercent = totalEquip > 0 ? Math.round((inOperation / totalEquip) * 100) : 0;

  const dateLabelStr = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const animatedEmployees = useAnimatedNumber(totalEmployees, 1500);
  const animatedGoalsTotal = useAnimatedNumber(planejamentoSummary.goalsTotal, 1500);
  const animatedGoalsDone = useAnimatedNumber(planejamentoSummary.goalsDone, 1500);
  const animatedGoalsRemaining = useAnimatedNumber(planejamentoSummary.goalsRemaining, 1500);
  const animatedPresent = useAnimatedNumber(presentToday, 1500);
  const animatedAbsences = useAnimatedNumber(absentToday, 1500);
  const animatedExternal = useAnimatedNumber(externalToday as number, 1500);
  const animatedEquipmentActive = useAnimatedNumber(inOperation, 1500);
  const animatedEquipmentTotal = useAnimatedNumber(totalEquip, 1500);

  const d = {
    location: "Barcarena – Vila do Conde",
    temperature: currentWeather?.temperature ?? "26",
    weatherLabel: "Parcialmente nublado",
    feelsLike: currentWeather?.apparentTemp ?? "30",
    humidity: currentWeather?.humidity ?? "90",
    wind: "12",
    employees: animatedEmployees,
    progress: planejamentoSummary.progress,
    goalsTotal: animatedGoalsTotal,
    goalsDone: animatedGoalsDone,
    goalsRemaining: animatedGoalsRemaining,
    present: animatedPresent,
    absences: animatedAbsences,
    external: animatedExternal,
    equipmentPercent: equipPercent,
    equipmentActive: animatedEquipmentActive,
    equipmentTotal: animatedEquipmentTotal,
    dateLabel: dateLabelStr,
  };

  return (
    <section className="dashboard-glass-v4">
      <div className="dgv4-heading">
        <div>
          <h1 className="!text-black dark:!text-white">Dashboard</h1>
          <p className="!text-black dark:!text-white">Visão geral da operação</p>
        </div>

        <button className="dgv4-date" type="button">
          <CalendarDays size={22} strokeWidth={1.6} />
          <span>{d.dateLabel}</span>
          <ChevronDown size={17} strokeWidth={1.6} />
        </button>
      </div>

      <div className="dgv4-grid">
        <div className="dgv4-col dgv4-col-left">
          <article className="dgv4-card dgv4-weather">
            <div className="dgv4-weather-head">
              <span><MapPin size={15} /> {d.location}</span>
              <span className="dgv4-live"><i /> Tempo Real</span>
            </div>

            <div className="dgv4-temp-row">
              <CloudSun className="dgv4-weather-icon" size={58} strokeWidth={1.25} />
              <div>
                <strong className="dgv4-temp">{d.temperature}°</strong>
                <p>{d.weatherLabel}</p>
              </div>
            </div>

            <div className="dgv4-weather-stats">
              <div><span><Thermometer size={16} /> Sensação</span><b>{d.feelsLike}°</b></div>
              <div><span><Droplets size={16} /> Umidade</span><b>{d.humidity}%</b></div>
              <div><span><Wind size={16} /> Vento</span><b>{d.wind} km/h</b></div>
            </div>
          </article>

          <article className="dgv4-card dgv4-employees">
            <div className="dgv4-card-title">
              <span>TOTAL DE FUNCIONÁRIOS</span>
              <Users size={19} strokeWidth={1.5} />
            </div>
            <div className="dgv4-employee-body">
              <Users className="dgv4-ghost-users" size={90} strokeWidth={1.2} />
              <strong>{d.employees}</strong>
              <span>Colaboradores ativos</span>
            </div>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-progress">
            <div className="dgv4-card-title dgv4-progress-title">
              <div>
                <span>AVANÇO MENSAL</span>
                <small>Metas do Planejamento</small>
              </div>
              <button type="button" onClick={() => navigate("/planejamento")}>Ver tudo →</button>
            </div>

            <div className="dgv4-ring-wrap">
              <Ring value={d.progress} label="AVANÇO" size={164} />
            </div>

            <div className="dgv4-goal-counts">
              <div><strong>{d.goalsTotal}</strong><span>TOTAL</span></div>
              <div className="is-done"><strong>{d.goalsDone}</strong><span>CONCLUÍDAS</span></div>
              <div className="is-left"><strong>{d.goalsRemaining}</strong><span>FALTAM</span></div>
            </div>

            <div className="dgv4-progressbar">
              <span style={{ width: `${Math.max(0, Math.min(100, d.progress))}%` }} />
            </div>
            <p className="dgv4-caption">{d.goalsDone} de {d.goalsTotal} metas concluídas</p>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>PRESENTES HOJE</span><Users size={18} /></div>
            <strong className="dgv4-small-number">{d.present}</strong>
            <MiniLine variant={1} />
            <div className="dgv4-axis"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
          </article>

          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>AUSÊNCIAS</span><CalendarDays size={17} /></div>
            <strong className="dgv4-small-number">{d.absences}</strong>
            <MiniBars />
            <div className="dgv4-axis dgv4-axis-days"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
          </article>

          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>TRABALHO EXTERNO</span><Users size={17} /></div>
            <strong className="dgv4-small-number">{d.external}</strong>
            <MiniLine variant={2} />
            <div className="dgv4-axis"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-equipment">
            <div className="dgv4-card-title dgv4-progress-title">
              <span>EQUIPAMENTOS ATIVOS</span>
              <button type="button" onClick={() => navigate("/equipamentos")}>Ver tudo →</button>
            </div>

            <div className="dgv4-equipment-ring">
              <Ring value={d.equipmentPercent} label="EM USO" size={176} />
            </div>

            <div className="dgv4-equipment-count">
              <strong>{d.equipmentActive}</strong>
              <span> de {d.equipmentTotal}</span>
              <p>equipamentos em uso</p>
            </div>

            <div className="dgv4-progressbar">
              <span style={{ width: `${Math.max(0, Math.min(100, d.equipmentPercent))}%` }} />
            </div>

            <p className="dgv4-equipment-caption">
              {d.equipmentActive} no canteiro de {d.equipmentTotal} equipamentos
            </p>
          </article>
        </div>
      </div>

      <div className="dgv4-extended" aria-label="Informações complementares do dashboard">
        <section className="dgv4-extended-block" aria-labelledby="dgv4-alertas-title">
          <div className="dgv4-section-heading">
            <div>
              <span className="dgv4-section-kicker">Acompanhamento</span>
              <h2 id="dgv4-alertas-title">Alertas e pessoas</h2>
            </div>
            <p>Lembretes, aniversariantes e vencimentos importantes.</p>
          </div>

          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-reminders-wrap">
              <ReminderHighlightBanner />
            </div>
          </Suspense>

          <div className="dgv4-extended-grid dgv4-extended-grid--people">
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-birthday-wrap">
                <BirthdayBanner />
              </div>
            </Suspense>
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-aso-wrap">
                <ASOExpiryBanner />
              </div>
            </Suspense>
          </div>
        </section>

        <section className="dgv4-extended-block" aria-labelledby="dgv4-seguranca-title">
          <div className="dgv4-section-heading">
            <div>
              <span className="dgv4-section-kicker">Segurança</span>
              <h2 id="dgv4-seguranca-title">Matriz e DDS</h2>
            </div>
            <p>Pendências da matriz e programação dos DDS.</p>
          </div>

          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-matrix-alert-wrap">
              <MatrixAlertBanner />
            </div>
          </Suspense>
          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-dds-wrap">
              <DDSHighlightCard />
            </div>
          </Suspense>
        </section>

        <section className="dgv4-extended-block" aria-labelledby="dgv4-operacao-title">
          <div className="dgv4-section-heading">
            <div>
              <span className="dgv4-section-kicker">Operação</span>
              <h2 id="dgv4-operacao-title">Campanhas e equipamentos</h2>
            </div>
            <p>Campanha do mês e situação detalhada dos equipamentos.</p>
          </div>

          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-campaign-wrap">
              <CampaignBanner />
            </div>
          </Suspense>
          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-equipment-status-wrap">
              <EquipmentStatusCard />
            </div>
          </Suspense>
        </section>

        <section className="dgv4-extended-block dgv4-extended-block--analytics" aria-labelledby="dgv4-analises-title">
          <div className="dgv4-section-heading">
            <div>
              <span className="dgv4-section-kicker">Indicadores</span>
              <h2 id="dgv4-analises-title">Atividades e desempenho</h2>
            </div>
            <p>Histórico operacional, presença, matriz e acompanhamento contratual.</p>
          </div>

          <Suspense fallback={<ExtendedSectionSkeleton />}>
            <div className="dgv4-legacy-surface dgv4-recent-wrap">
              <RecentActivitiesCard />
            </div>
          </Suspense>

          <div className="dgv4-analytics-grid">
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-chart-wrap dgv4-chart-wrap--wide">
                <AttendanceTrendChart />
              </div>
            </Suspense>
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-chart-wrap dgv4-chart-wrap--gauge">
                <MatrixGauge referenceDate={selectedDate} />
              </div>
            </Suspense>
          </div>

          <div className="dgv4-analytics-grid">
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-chart-wrap dgv4-chart-wrap--wide">
                <AtaContratoProgressCard />
              </div>
            </Suspense>
            <Suspense fallback={<ExtendedSectionSkeleton />}>
              <div className="dgv4-legacy-surface dgv4-chart-wrap dgv4-chart-wrap--gauge">
                <MatrixSideChart />
              </div>
            </Suspense>
          </div>
        </section>
      </div>
    </section>
  );
}
