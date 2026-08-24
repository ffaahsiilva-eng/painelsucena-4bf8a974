import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, ClipboardCheck, AlertCircle, Activity, Calendar as CalendarIcon, Filter, ArrowUp, ArrowRight, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SimpleTree } from "@/components/ui/simple-growth-tree";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Layout from "@/components/layout/Layout";
import { lazy, Suspense } from "react";

const ModernStatCard = lazy(() => import("@/components/dashboard/ModernStatCard"));
const PresenceGauge = lazy(() => import("@/components/dashboard/PresenceGauge").then(m => ({ default: m.PresenceGauge })));
const MatrixGauge = lazy(() => import("@/components/dashboard/MatrixGauge").then(m => ({ default: m.MatrixGauge })));
const AttendanceTrendChart = lazy(() => import("@/components/dashboard/AttendanceTrendChart").then(m => ({ default: m.AttendanceTrendChart })));
const MatrixSideChart = lazy(() => import("@/components/dashboard/MatrixSideChart").then(m => ({ default: m.MatrixSideChart })));
const DDSHighlightCard = lazy(() => import("@/components/dds/DDSHighlightCard").then(m => ({ default: m.DDSHighlightCard })));
const ReminderHighlightBanner = lazy(() => import("@/components/reminders/ReminderHighlightBanner").then(m => ({ default: m.ReminderHighlightBanner })));
const MatrixAlertBanner = lazy(() => import("@/components/dashboard/MatrixAlertBanner").then(m => ({ default: m.MatrixAlertBanner })));
const CampaignBanner = lazy(() => import("@/components/campaigns/CampaignBanner").then(m => ({ default: m.CampaignBanner })));
const OrderHighlightBanner = lazy(() => import("@/components/orders/OrderHighlightBanner").then(m => ({ default: m.OrderHighlightBanner })));
const EquipmentStatusCard = lazy(() => import("@/components/dashboard/EquipmentStatusCard").then(m => ({ default: m.EquipmentStatusCard })));
const DocumentExpiryBanner = lazy(() => import("@/components/documents/DocumentExpiryBanner").then(m => ({ default: m.DocumentExpiryBanner })));
const NRExpiryBanner = lazy(() => import("@/components/dashboard/NRExpiryBanner").then(m => ({ default: m.NRExpiryBanner })));
const ASOExpiryBanner = lazy(() => import("@/components/dashboard/ASOExpiryBanner").then(m => ({ default: m.ASOExpiryBanner })));
const VehicleExpiryBanner = lazy(() => import("@/components/vistorias/VehicleExpiryBanner").then(m => ({ default: m.VehicleExpiryBanner })));
const SlingInspectionBanner = lazy(() => import("@/components/dashboard/SlingInspectionBanner").then(m => ({ default: m.SlingInspectionBanner })));
const InspectionScheduleBanner = lazy(() => import("@/components/dashboard/InspectionScheduleBanner").then(m => ({ default: m.InspectionScheduleBanner })));
const WeatherWidget = lazy(() => import("@/components/dashboard/WeatherWidget").then(m => ({ default: m.WeatherWidget })));
const DraggableDashboardItem = lazy(() => import("@/components/dashboard/DraggableDashboardItem").then(m => ({ default: m.DraggableDashboardItem })));
const DashboardEditControls = lazy(() => import("@/components/dashboard/DashboardEditControls").then(m => ({ default: m.DashboardEditControls })));
const BirthdayBanner = lazy(() => import("@/components/dashboard/BirthdayBanner"));
const DDSPresenterAlert = lazy(() => import("@/components/dds/DDSPresenterAlert"));
const RecentActivitiesCard = lazy(() => import("@/components/dashboard/RecentActivitiesCard").then(m => ({ default: m.RecentActivitiesCard })));
const PlanejamentoProgressCard = lazy(() => import("@/components/dashboard/PlanejamentoProgressCard").then(m => ({ default: m.PlanejamentoProgressCard })));
const AtaContratoProgressCard = lazy(() => import("@/components/dashboard/AtaContratoProgressCard").then(m => ({ default: m.AtaContratoProgressCard })));
const MatrixAlertBannerPreload = () => {
  useEffect(() => {
    import("@/components/dashboard/MatrixAlertBanner");
  }, []);
  return null;
};
import { useCampaignNotifications } from "@/hooks/useCampaignNotifications";
import { useLastDayMatrixCheck } from "@/hooks/useLastDayMatrixCheck";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
import { MatrixReminderModal } from "@/components/matriz/MatrixReminderModal";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useAttendanceAreaAssignments } from "@/hooks/useAttendanceAreaAssignments";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut, useAllRegisteredEquipmentCount } from "@/hooks/useEquipmentMovements";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useDocumentExpiryNotifications } from "@/hooks/useDocumentExpiryNotifications";
import { useVehicleExpiryNotifications } from "@/hooks/useVehicleExpiryNotifications";
import { useASOExpiryNotifications } from "@/hooks/useASOExpiryNotifications";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useDashboardOrder, DashboardItemId, DEFAULT_DASHBOARD_ORDER } from "@/hooks/useDashboardOrder";
import { useHolidayNotification } from "@/hooks/useHolidayNotification";
import { useFridayNotification } from "@/hooks/useFridayNotification";
import { toast } from "sonner";

const DashboardItemSkeleton = () => (
  <div className="w-full h-32 bg-card/50 animate-pulse rounded-2xl border border-border/50 glass-card-dashboard" />
);

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { settings } = useSiteSettings();
  const uiTheme = (profile as any)?.ui_theme || "classic";
  const isDockTheme = uiTheme === "macos-dock";
  const todayString = getBrazilNorthTodayString();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const [y, m, d] = todayString.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const isToday = selectedDateString === todayString;
  const today = selectedDateString;
  const { data: rhData } = useRHEfetivo();
  const { data: dailyMarks } = useAttendanceDailyMarks(selectedDateString);
  const { data: areaAssignments } = useAttendanceAreaAssignments();
  const { data: equipment } = useEquipment();
  const { data: currentlyOutEquipment } = useEquipmentCurrentlyOut();
  const { data: allRegisteredCount } = useAllRegisteredEquipmentCount();
  const { data: jardinagemEquipment } = useJardinagemEquipment();
  const { dashboardOrder, updateOrder, isLoading: isLoadingOrder } = useDashboardOrder();
  useHolidayNotification();
  useFridayNotification();
  const lastDayMatrix = useLastDayMatrixCheck();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<DashboardItemId[]>(dashboardOrder);
  const [isSaving, setIsSaving] = useState(false);
  

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useCampaignNotifications();
  useDocumentExpiryNotifications();
  useVehicleExpiryNotifications();
  useASOExpiryNotifications();

  const activeColaboradores = useMemo(() => {
    if (!rhData?.colaboradores) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores.filter(c => !deletedIds.includes(c.id));
  }, [rhData]);

  const totalEmployees = activeColaboradores.length;
  
  // Áreas que tiveram a Lista de Presença salva no dia (independente de ter ausentes)
  const savedAreasToday = useMemo(() => {
    const set = new Set<string>();
    (dailyMarks ?? []).forEach((m) => set.add(m.area));
    return set;
  }, [dailyMarks]);

  // Conta apenas colaboradores cuja área teve a lista salva
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

  // Trabalho Externo do dia — busca em TODAS as áreas da lista de presença salva
  // (attendance_daily_marks.external_work_employee_ids) + RH (attendance_absence_reasons)
  const { data: externalToday = 0 } = useQuery({
    queryKey: ["external_work_count_all_areas", selectedDateString],
    queryFn: async () => {
      const ids = new Set<string>();

      const { data: marks, error: marksErr } = await supabase
        .from("attendance_daily_marks")
        .select("external_work_employee_ids")
        .eq("date", selectedDateString);
      if (marksErr) throw marksErr;
      (marks || []).forEach((m: any) => {
        (m.external_work_employee_ids || []).forEach((id: any) => ids.add(String(id)));
      });

      const { data: rh, error: rhErr } = await supabase
        .from("attendance_absence_reasons")
        .select("employee_id")
        .eq("date", selectedDateString)
        .eq("reason", "Trabalho Externo");
      if (rhErr) throw rhErr;
      (rh || []).forEach((r: any) => ids.add(String(r.employee_id)));

      return ids.size;
    },
  });
  const animatedExternalToday = useAnimatedNumber(externalToday, 1000);

  // Se nenhuma área salvou a lista hoje => 0 presentes / 0%
  const presentToday = savedAreasToday.size === 0 ? 0 : Math.max(0, expectedToday - absentToday);
  const presencePercent =
    savedAreasToday.size === 0 || totalEmployees === 0
      ? 0
      : Math.round((presentToday / totalEmployees) * 100);
  
  const jardinagemTotal = jardinagemEquipment?.length || 0;
  const jardinagemIn = jardinagemEquipment?.filter(e => e.status === "entrou").length || 0;
  // Filter currentlyInEquipment to only count plates that belong to the equipment table (vehicles)
  const vehiclePlates = new Set((equipment || []).map(e => e.plate));
  const vehiclesOut = (currentlyOutEquipment || []).filter(m => vehiclePlates.has(m.plate)).length;
  const vehiclesIn = (equipment || []).length - vehiclesOut;
  const inOperation = vehiclesIn + jardinagemIn;
  const totalEquip = (equipment?.length || 0) + jardinagemTotal;
  const equipPercent = totalEquip > 0 ? Math.round(inOperation / totalEquip * 100) : 0;

  const animatedEquipPercent = useAnimatedNumber(equipPercent, 1000);
  const animatedInOperation = useAnimatedNumber(inOperation, 1000);
  const animatedTotalEquip = useAnimatedNumber(totalEquip, 1000);
  const animatedPresentToday = useAnimatedNumber(typeof presentToday === "number" ? presentToday : 0, 1000);
  const animatedAbsentToday = useAnimatedNumber(absentToday, 1000);
  const animatedTotalEmployees = useAnimatedNumber(totalEmployees, 1000);

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      setLocalOrder(dashboardOrder);
    }
    setIsEditMode(!isEditMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as DashboardItemId);
        const newIndex = items.indexOf(over.id as DashboardItemId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateOrder(localOrder);
    setIsSaving(false);
    if (success) {
      toast.success("Ordem dos destaques salva!");
      setIsEditMode(false);
    } else {
      toast.error("Erro ao salvar ordem");
    }
  };

  const handleCancel = () => {
    setLocalOrder(dashboardOrder);
    setIsEditMode(false);
  };

  const handleReset = () => {
    setLocalOrder(DEFAULT_DASHBOARD_ORDER);
  };

  const hasChanges = JSON.stringify(localOrder) !== JSON.stringify(dashboardOrder);
  const currentOrder = isEditMode ? localOrder : dashboardOrder;
  const sortableOrder = currentOrder.filter(id => id !== "birthday");

  const renderDashboardItem = (id: DashboardItemId) => {
    switch (id) {
      case "birthday": return <BirthdayBanner />;
      case "matrix_alert": return <MatrixAlertBanner />;
      
      case "campaign": return <CampaignBanner />;
      case "reminder": return null;
      case "order": return <OrderHighlightBanner />;
      case "vehicle_expiry": return <VehicleExpiryBanner />;
      case "document_expiry": return <DocumentExpiryBanner />;
      case "sling_inspection": return <SlingInspectionBanner />;
      case "dds": return <DDSHighlightCard />;
      case "equipment": return <EquipmentStatusCard />;
      case "stats": return null;
      case "matrix_chart": return null;
      default: return null;
    }
  };

  return (
    <Layout>
      {/* Last day of month matrix modals */}
      <CelebrationModal
        isOpen={lastDayMatrix.showCelebration}
        onClose={() => lastDayMatrix.setShowCelebration(false)}
        cargoName={lastDayMatrix.cargoName}
        userName={lastDayMatrix.userName}
        userAvatarUrl={lastDayMatrix.userAvatarUrl}
      />
      <MatrixReminderModal
        isOpen={lastDayMatrix.showReminder}
        onClose={() => lastDayMatrix.setShowReminder(false)}
        cargoName={lastDayMatrix.cargoName}
        progress={lastDayMatrix.progress}
        userName={lastDayMatrix.userName}
        userAvatarUrl={lastDayMatrix.userAvatarUrl}
        daysUntilMonthEnd={lastDayMatrix.daysUntilMonthEnd}
        currentMonthName={lastDayMatrix.currentMonthName}
        pendingCargos={lastDayMatrix.pendingCargos}
      />
      <div className="container mx-auto px-4 sm:px-8 py-6 sm:py-10 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 animate-fade-in gap-4">
          {isDockTheme ? (
            <div className="flex-1 flex justify-center pl-16 pt-2">
              <SimpleTree className="w-32 h-24 sm:w-56 sm:h-48" />
            </div>
          ) : (
            <div>
              <EditablePageTitle
                pageKey="dashboard"
                defaultValue="Dashboard"
                className="text-4xl sm:text-5xl font-bold text-gradient leading-tight font-weghorst tracking-widest"
                as="h1"
              />
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                Visão geral da operação
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title={format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  className="group inline-flex flex-col items-center gap-0 px-2 py-1 bg-transparent border-0 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon
                      className="h-6 w-6 sm:h-7 sm:w-7 text-white"
                      strokeWidth={1.25}
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                    />
                    <span
                      className="text-white leading-none"
                      style={{
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: "clamp(1rem, 2vw, 2.25rem)",
                        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    >
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 300 14"
                    className="w-[150px] sm:w-[260px] h-3 -mt-1 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                  >
                    <path d="M5 8 C 60 2, 120 12, 180 6 S 280 4, 295 9" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {!isToday && (
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = todayString.split("-").map(Number);
                  setSelectedDate(new Date(y, m - 1, d));
                }}
                className="text-xs text-primary hover:underline"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        {/* Main stats grid */}
        <Suspense fallback={<DashboardItemSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-8 animate-slide-up items-stretch">
            {/* Left column: Weather + Total Funcionários */}
            <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6">
              <WeatherWidget />
              <ModernStatCard
                title="Total de Funcionários"
                value={animatedTotalEmployees}
                percentage={presencePercent}
                icon={Users}
                variant="gauge"
              />
            </div>

            {/* Center: Avanço Mensal (Planejamento) */}
            <div className="lg:col-span-3">
              <PlanejamentoProgressCard />
            </div>

            {/* Right-center: Presentes Hoje + Ausências */}
            <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6">
              <ModernStatCard
                title="Presentes hoje"
                value={animatedPresentToday}
                percentage={presencePercent}
                icon={ClipboardCheck}
                variant="sparkline"
                sparklineData={[5, 8, 6, 9, 7, 10, presentToday || 8]}
              />
              <ModernStatCard
                title="Ausências"
                value={animatedAbsentToday}
                percentage={totalEmployees > 0 ? Math.round(absentToday / totalEmployees * 100) : 0}
                icon={AlertCircle}
                variant="bars"
                barData={[2, 4, 1, 3, 2, 5, absentToday || 1]}
              />
              <ModernStatCard
                title="Trabalho Externo"
                value={animatedExternalToday}
                percentage={totalEmployees > 0 ? Math.round((externalToday as number) / totalEmployees * 100) : 0}
                icon={Briefcase}
                variant="sparkline"
                sparklineData={[1, 2, 1, 3, 2, 4, (externalToday as number) || 1]}
              />
            </div>

            {/* Far right: Equipamentos Ativos (clean white card matching reference) */}
            <div className="lg:col-span-3">
            <div className="rounded-2xl p-5 h-full flex flex-col bg-card border border-border shadow-sm transition-transform hover:scale-[1.01] glass-card-dashboard">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Equipamentos Ativos
                </p>
                <Link
                  to="/status-geral-equipamentos"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver tudo <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex items-center justify-center flex-1 my-2">
                <div className="relative">
                  <svg height={140} width={140}>
                    <circle
                      stroke="hsl(var(--muted))"
                      fill="transparent"
                      strokeWidth={12}
                      r={60}
                      cx={70}
                      cy={70}
                    />
                    <circle
                      stroke="hsl(var(--primary))"
                      fill="transparent"
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeDasharray={`${60 * 2 * Math.PI} ${60 * 2 * Math.PI}`}
                      strokeDashoffset={60 * 2 * Math.PI - (animatedEquipPercent / 100) * 60 * 2 * Math.PI}
                      r={60}
                      cx={70}
                      cy={70}
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-primary tracking-widest leading-none" style={{ fontFamily: "Brazil2026, sans-serif" }}>
                      {animatedEquipPercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground tracking-widest leading-none" style={{ fontFamily: "Brazil2026, sans-serif" }}>
                    {animatedInOperation}
                  </span>
                  <span className="text-sm text-muted-foreground self-end mb-0.5">de {animatedTotalEquip}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  equipamentos em uso
                </p>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${animatedEquipPercent}%`, transition: "width 80ms linear" }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  <span style={{ fontFamily: "Brazil2026, sans-serif" }} className="tracking-widest">{animatedInOperation}</span> no canteiro de <span style={{ fontFamily: "Brazil2026, sans-serif" }} className="tracking-widest">{animatedTotalEquip}</span> equipamentos
                </p>
              </div>
            </div>
          </div>
        </div>
      </Suspense>

        {/* Reminder Banner */}
        <div className="mb-4">
          <Suspense fallback={<DashboardItemSkeleton />}>
            <ReminderHighlightBanner />
          </Suspense>
        </div>

        {/* Fixed banners */}
        <Suspense fallback={null}>
          <InspectionScheduleBanner />
          <BirthdayBanner />
          <DDSPresenterAlert />
          <NRExpiryBanner />
          <ASOExpiryBanner />
        </Suspense>

        {/* Draggable items */}
        {!isLoadingOrder && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4 cv-auto">
                {sortableOrder.map((id) => (
                  <DraggableDashboardItem key={id} id={id} isEditMode={isEditMode}>
                    <div className="cv-auto" style={{ containIntrinsicSize: "0 200px" }}>
                      {renderDashboardItem(id)}
                    </div>
                  </DraggableDashboardItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Recent activities row (mix real do sistema) */}
        <div className="mt-6 mb-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <Suspense fallback={<DashboardItemSkeleton />}>
            <RecentActivitiesCard />
          </Suspense>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <AttendanceTrendChart />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <MatrixGauge referenceDate={selectedDate} />
          </div>
        </div>

        {/* Matriz do mês (gráfico lateral) + Ata de Contrato */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.18s" }}>
            <Suspense fallback={<DashboardItemSkeleton />}>
              <AtaContratoProgressCard />
            </Suspense>
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <MatrixSideChart />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
