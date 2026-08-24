import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTodayDDS } from "@/hooks/useDDSSchedule";
import { getCurrentMonthCampaigns } from "@/data/campaignData";
import { useActiveReminders } from "@/hooks/useReminders";
import { useOrderHighlights } from "@/hooks/useOrderHighlights";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { usePlanejamentoMetas } from "@/hooks/usePlanejamentoMetas";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useEquipment } from "@/hooks/useEquipment";
import { useCurrentTemperature } from "@/hooks/useCurrentTemperature";
import { useSlingEquipment } from "@/hooks/useSlingEquipment";
import { useMeetingMinutes } from "@/hooks/useMeetingMinutes";
import { getEffectiveAsoExpiry } from "@/lib/asoValidity";
import { AnimatePresence, motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useMatrixProgress } from "@/hooks/useMatrixProgress";

interface ScreensaverHighlight {
  id: string;
  title: string;
  description: string;
  photo_url?: string;
  type: "dds" | "campaign" | "reminder" | "order" | "meta" | "attendance" | "equipment" | "weather" | "aso" | "sling" | "minute" | "matrix";
  matrixData?: any;
}

export const ScreensaverClock = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { data: todayDDS } = useTodayDDS();
  const { data: activeReminders } = useActiveReminders();
  const { data: orderHighlights } = useOrderHighlights();
  const { data: metas } = usePlanejamentoMetas();
  const { data: rhData } = useRHEfetivo();
  const today = new Date().toISOString().split('T')[0];
  const { data: attendanceMarks } = useAttendanceDailyMarks(today);
  const { data: equipments } = useEquipment();
  const { data: weatherData } = useCurrentTemperature();
  const { data: slingsData } = useSlingEquipment();
  const currentMonthColor = new Date().getMonth() + 1; // Simplificado para o screensaver
  const pendingInspectionsCount = slingsData?.filter(s => s.color === (["red", "blue", "yellow", "green"][(currentMonthColor - 1) % 4])).length || 0;
  const { data: minutes } = useMeetingMinutes();
  
  const { completedTasks } = useMatrixProgress();
  
  const monthCampaigns = getCurrentMonthCampaigns();
  const { customizations } = usePageCustomizations("campanhas");

  const highlights = React.useMemo(() => {
    const list: ScreensaverHighlight[] = [];

    const cargoDefinitions = [
      { id: "preposto", cargo: "Preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
      { id: "encarregado-geral", cargo: "Enc. Geral", tarefas: ["eg1", "eg2", "eg3"] },
      { id: "encarregado-i", cargo: "Enc. I", tarefas: ["e1-1", "e1-2", "e1-3"] },
      { id: "encarregado-ii", cargo: "Enc. II", tarefas: ["e2-1", "e2-2", "e2-3"] },
      { id: "tecnico-seguranca-i", cargo: "Téc. Seg. I", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
      { id: "tecnico-seguranca-ii", cargo: "Téc. Seg. II", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
    ];

    // DDS
    if (todayDDS) {
      list.push({
        id: `dds-${todayDDS.id}`,
        title: "DDS de Hoje",
        description: todayDDS.theme,
        photo_url: todayDDS.photo_url || (todayDDS as any).event_photo_url || "https://images.unsplash.com/photo-1521791136064-7986c2959210?auto=format&fit=crop&q=80",
        type: "dds"
      });
    }

    // Campanhas
    if (monthCampaigns) {
      monthCampaigns.campaigns.forEach((c, idx) => {
        const bannerKey = `banner-month-${monthCampaigns.month}`;
        const customPhoto = customizations?.find(cust => cust.element_key === bannerKey)?.image_url;
        
        const staticBanners: Record<number, string> = {
          2: "/campaigns/campanha-2.png",
          3: "/campaigns/campanha-3.png",
          4: "/campaigns/campanha-4.png",
          5: "/campaigns/campanha-5.png",
          6: "/campaigns/campanha-6.png",
          7: "/campaigns/campanha-7.png",
          8: "/campaigns/campanha-8.png",
          9: "/campaigns/campanha-9.png",
          10: "/campaigns/campanha-10.png",
          11: "/campaigns/campanha-11.png",
          12: "/campaigns/campanha-12.png",
        };

        list.push({
          id: `campaign-${idx}`,
          title: `Campanha ${c.colorName}`,
          description: c.name + ": " + c.description,
          photo_url: customPhoto || staticBanners[monthCampaigns.month] || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80",
          type: "campaign"
        });
      });
    }

    // Lembretes
    if (activeReminders) {
      activeReminders.forEach(r => {
        list.push({
          id: `reminder-${r.id}`,
          title: "Lembrete: " + r.title,
          description: r.description || "",
          photo_url: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80",
          type: "reminder"
        });
      });
    }

    // Pedidos
    if (orderHighlights) {
      orderHighlights.forEach(o => {
        list.push({
          id: `order-${o.id}`,
          title: "Pedido: " + o.product_name,
          description: `Previsão: ${o.expected_date}`,
          photo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80",
          type: "order"
        });
      });
    }

    // Avanço Mensal Atual (Metas)
    if (metas && metas.length > 0) {
      const activeMetas = metas.filter(m => !m.is_section_header && m.meta > 0);
      if (activeMetas.length > 0) {
        const totalMeta = activeMetas.reduce((acc, m) => acc + m.meta, 0);
        const totalReal = activeMetas.reduce((acc, m) => acc + Math.min(m.realizado, m.meta), 0);
        const avgProgress = totalMeta > 0 ? Math.round((totalReal / totalMeta) * 100) : 0;
        list.push({
          id: "monthly-advance",
          title: "Avanço Mensal",
          description: `Progresso médio das metas: ${avgProgress}% concluído.`,
          photo_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80",
          type: "meta"
        });
      }
    }

    // Presentes e Ausentes Hoje
    if (rhData?.colaboradores && attendanceMarks) {
      const totalColabs = rhData.colaboradores.length;
      const absentIds = new Set(attendanceMarks.flatMap(m => m.absent_employee_ids));
      const absentCount = absentIds.size;
      const presentCount = totalColabs - absentCount;
      
      list.push({
        id: "attendance-summary",
        title: "Efetivo de Hoje",
        description: `${presentCount} Presentes • ${absentCount} Ausentes`,
        photo_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80",
        type: "attendance"
      });
    }

    // Equipamentos Ativos
    if (equipments && equipments.length > 0) {
      const activeEquip = equipments.filter(e => e.stop_reason === "none" || !e.stop_reason).length;
      list.push({
        id: "active-equipment",
        title: "Equipamentos em Operação",
        description: `Todos os ${equipments.length} equipamentos estão ativos no canteiro hoje.`,
        photo_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80",
        type: "equipment"
      });
    }

    // Temperatura Atual
    if (weatherData) {
      const constructionImages = [
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1590725140246-20acdee442be?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
      ];
      const todayImage = constructionImages[new Date().getDay()];

      list.push({
        id: "current-weather",
        title: `Temperatura: ${weatherData.temperature}°C`,
        description: `Sensação térmica de ${weatherData.apparentTemp}°C • Humidade: ${weatherData.humidity}%`,
        photo_url: todayImage,
        type: "weather"
      });
    }

    // Vencimento de ASOs
    if (rhData?.colaboradores) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expiringSoon = rhData.colaboradores.filter(c => {
        const expiry = getEffectiveAsoExpiry(c.aso, c.admissao);
        if (!expiry) return false;
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      });

      if (expiringSoon.length > 0) {
        list.push({
          id: "aso-expiry",
          title: "Vencimento de ASOs",
          description: `${expiringSoon.length} colaboradores com ASO vencendo nos próximos 30 dias.`,
          photo_url: "https://images.unsplash.com/photo-1505751172107-5962250d73b9?auto=format&fit=crop&q=80",
          type: "aso"
        });
      }
    }

    // Vistoria de Cintas
    if (pendingInspectionsCount > 0) {
      list.push({
        id: "sling-inspections",
        title: "Vistoria de Cintas",
        description: `Existem ${pendingInspectionsCount} cintas que requerem atenção este mês.`,
        photo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80",
        type: "sling"
      });
    }

    // Atas de Contrato (Última ata)
    if (minutes && minutes.length > 0) {
      const latestMinute = minutes[0];
      list.push({
        id: `minute-${latestMinute.id}`,
        title: "Última Ata de Reunião",
        description: `${latestMinute.title} - ${latestMinute.meeting_date ? new Date(latestMinute.meeting_date).toLocaleDateString('pt-BR') : 'Data não informada'}`,
        photo_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80",
        type: "minute"
      });
    }

    // Matriz de Competências/Tarefas
    if (completedTasks && completedTasks.length > 0) {
      const completedIds = new Set(completedTasks);
      const totalTasks = cargoDefinitions.reduce((s, c) => s + c.tarefas.length, 0);
      const completedCount = cargoDefinitions.reduce(
        (s, c) => s + c.tarefas.filter((t) => completedIds.has(t)).length,
        0
      );
      const overallProgress = Math.round((completedCount / totalTasks) * 100);

      const chartData = cargoDefinitions.map((c) => ({
        name: c.cargo,
        value: Math.round(
          (c.tarefas.filter((t) => completedIds.has(t)).length / c.tarefas.length) * 100
        ),
      }));

      list.push({
        id: "matrix-status",
        title: "Matriz de Competências",
        description: `Progresso Geral: ${overallProgress}% das tarefas concluídas este mês.`,
        photo_url: "https://images.unsplash.com/photo-1454165833762-02651d58d92c?auto=format&fit=crop&w=1200&q=80",
        type: "matrix",
        matrixData: chartData
      });
    }

    return list;
  }, [todayDDS, activeReminders, orderHighlights, monthCampaigns, customizations, metas, rhData, attendanceMarks, equipments, weatherData, pendingInspectionsCount, minutes, completedTasks]);

  useEffect(() => {
    if (!settings.screensaver_enabled) {
      setIsActive(false);
      clearTimeout(timeoutRef.current);
      return;
    }

    const timeoutMs = settings.screensaver_timeout * 60 * 1000;

    const handleActivity = () => {
      if (isActive) return;
      
      clearTimeout(timeoutRef.current);
      if (settings.screensaver_enabled && settings.screensaver_timeout > 0) {
        timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);
      }
    };

    // Use separate event listeners for activity and dismiss
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    
    // Explicitly handle "Immediate" (0) mode
    if (settings.screensaver_enabled && !isActive) {
      if (settings.screensaver_timeout === 0) {
        // If we just clicked to dismiss and timeout is 0, we don't want it to pop up again immediately
        // The onClick handler handles the 5-min delay for the next activation
      } else {
        timeoutRef.current = setTimeout(() => setIsActive(true), timeoutMs);
      }
    }

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [settings.screensaver_enabled, settings.screensaver_timeout, isActive]);

  useEffect(() => {
    if (!isActive || highlights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [isActive, highlights.length]);

  if (!isActive || !user) return null;

  const currentHighlight = highlights[currentIndex] || { 
    id: "default", 
    title: "Mantenha o foco", 
    description: "Sua produtividade é a nossa força.",
    photo_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80",
    type: "dds"
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center cursor-pointer overflow-hidden"
      onClick={() => {
        setIsActive(false);
        // Reset timeout when dismissing
        clearTimeout(timeoutRef.current);
        const timeoutMs = settings.screensaver_timeout * 60 * 1000;
        const reactivationMs = settings.screensaver_timeout === 0 ? 5 * 60 * 1000 : timeoutMs;
        if (settings.screensaver_enabled) {
          timeoutRef.current = setTimeout(() => setIsActive(true), reactivationMs);
        }
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHighlight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center"
        >
          {/* Background Image with Gradient */}
          {currentHighlight.photo_url ? (
            <div className="absolute inset-0 z-0">
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: "linear" }}
                src={currentHighlight.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black" />
          )}

          {/* Content */}
          <div className="relative z-10 max-w-4xl space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-2xl">
                {currentHighlight.title}
              </h2>
              <p className="text-xl md:text-3xl text-gray-200 font-medium leading-relaxed drop-shadow-lg">
                {currentHighlight.description}
              </p>
            </motion.div>

            {currentHighlight.type === "matrix" && currentHighlight.matrixData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="h-[250px] w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentHighlight.matrixData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.6)" 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="rgba(255,255,255,0.6)" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Visual Indicator */}
            <div className="flex justify-center gap-2 mt-12">
              {highlights.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === currentIndex ? "w-12 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Clock in the corner */}
      <div className="absolute bottom-8 right-8 text-white/50 font-mono text-2xl">
        <ClockDisplay />
      </div>
    </div>
  );
};

const ClockDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  );
};
