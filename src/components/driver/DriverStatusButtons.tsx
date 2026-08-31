import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel, 
  Loader2,
  Power,
  Gauge,
  Car,
  Info,
  AlertCircle,
  WifiOff,
  Utensils,
  Wrench,
  Droplets,
  Sprout,
  Waves,
  CloudDrizzle,
  CarFront,
  CheckCircle2
} from "lucide-react";

import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory, type StopReason } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FuelLevelGauge, type FuelLevel } from "./FuelLevelGauge";
import { useQueryClient } from "@tanstack/react-query";
import { useVehicleSelection } from "@/hooks/useVehicleSelection";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { useCreateShiftRecord, useUpdateShiftRecord, useAddStatusToHistory, useShiftRecordByEquipment } from "@/hooks/useDailyShiftRecords";
import { useCreateEquipmentMovement } from "@/hooks/useEquipmentMovements";
import { generateAndUploadParteDiariaPng } from "@/lib/parteDiariaShare";
import { confirmOnce } from "@/lib/pendingConfirm";
import { logDriverError } from "@/lib/driverErrorLog";
import {
  beginDriverAction,
  commitDriverAction,
  failDriverAction,
  newClientActionId,
} from "@/lib/driverActionQueue";



type DriverStopReason = StopReason;

interface StatusButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: DriverStopReason;
}

const statusButtons: StatusButton[] = [
  {
    id: "services",
    label: "Serviços",
    icon: <Wrench className="h-6 w-6" />,
    color: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white",
    action: "services" as any,
  },
  {
    id: "waiting",
    label: "Aguardando",
    icon: <Clock className="h-6 w-6" />,
    color: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white",
    action: "waiting",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="h-6 w-6" />,
    color: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white",
    action: "rain",
  },
  {
    id: "almoco",
    label: "Almoço",
    icon: <Utensils className="h-6 w-6" />,
    color: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white",
    action: "almoco" as any,
  },
];

const getStatusLabel = (stopReason: string | null, defectDescription?: string | null) => {
  switch (stopReason) {
    case "none":
    case null:
      return { label: "Operando", color: "bg-green-500" };
    case "waiting":
      return { label: "Aguardando Frente", color: "bg-yellow-500" };
    case "rain":
      return { label: "Parado (Chuva)", color: "bg-blue-500" };
    case "end_of_day":
      return { label: "Abastecendo", color: "bg-red-600" };
    case "almoco":
      return { label: "Almoço", color: "bg-amber-500" };
    case "maintenance":
      return { label: "Manutenção", color: "bg-red-500" };
    case "servico": {
      const svc = (defectDescription || "").replace(/^Serviço:\s*/i, "").trim();
      return { label: svc ? `Serviço: ${svc}` : "Em Serviço", color: "bg-green-600" };
    }
    case "end_of_shift":
      return { label: "Fim de Turno", color: "bg-gray-500" };
    default:
      return { label: "Parado", color: "bg-gray-500" };
  }
};

export function DriverStatusButtons() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Guarda contra dupla submissão: se uma ação está em voo, ignore cliques repetidos
  // mesmo antes do React aplicar o estado `isUpdating`.
  const inFlightRef = useRef<Set<string>>(new Set());
  const acquire = (key: string) => {
    if (inFlightRef.current.has(key)) return false;
    inFlightRef.current.add(key);
    return true;
  };
  const release = (key: string) => {
    inFlightRef.current.delete(key);
  };
  const [servicesOpen, setServicesOpen] = useState(false);
  const [submittingServiceId, setSubmittingServiceId] = useState<string | null>(null);
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("half");
  const [showEndShiftDialog, setShowEndShiftDialog] = useState(false);
  const [showStartShiftDialog, setShowStartShiftDialog] = useState(false);
  const [endShiftFuelLevel, setEndShiftFuelLevel] = useState<FuelLevel>("half");
  const [endShiftHorimeter, setEndShiftHorimeter] = useState("");
  const [endShiftKm, setEndShiftKm] = useState("");
  const [startShiftHorimeter, setStartShiftHorimeter] = useState("");
  const [startShiftKm, setStartShiftKm] = useState("");
  const [initialHorimeter, setInitialHorimeter] = useState<string | null>(null);
  const [initialKm, setInitialKm] = useState<string | null>(null);
  const [endShiftError, setEndShiftError] = useState<string | null>(null);
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();
  const { data: stopHistory = [] } = useEquipmentStopHistory(selectedVehicleId || undefined);
  const { isOnline, addPendingAction } = useOfflineSyncV2();
  const createShiftRecord = useCreateShiftRecord();
  const updateShiftRecord = useUpdateShiftRecord();
  const addStatusToHistory = useAddStatusToHistory();
  const createEquipmentMovement = useCreateEquipmentMovement();
  const { data: currentShiftRecord } = useShiftRecordByEquipment(selectedVehicleId);

  useEffect(() => {
    if (currentShiftRecord && selectedVehicleId) {
      console.log("Rehydrating shift from DB:", currentShiftRecord);
      const h = currentShiftRecord.initial_horimeter != null ? String(currentShiftRecord.initial_horimeter) : "0";
      const k = currentShiftRecord.initial_km != null ? String(currentShiftRecord.initial_km) : "0";
      
      localStorage.setItem(`shift_horimeter_${selectedVehicleId}`, h);
      localStorage.setItem(`shift_km_${selectedVehicleId}`, k);
      setInitialHorimeter(h);
      setInitialKm(k);
      
      if (currentShiftRecord.shift_start_time) {
        const ts = new Date(currentShiftRecord.shift_start_time).getTime();
        localStorage.setItem(`shift_start_time_${selectedVehicleId}`, ts.toString());
      }
    }
  }, [currentShiftRecord, selectedVehicleId]);

  // Activity timer - counts elapsed time since current status was selected
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
    
    // Load initial values from localStorage if they exist
    if (vehicleId) {
      const storedHorimeter = localStorage.getItem(`shift_horimeter_${vehicleId}`);
      const storedKm = localStorage.getItem(`shift_km_${vehicleId}`);
      setInitialHorimeter(storedHorimeter);
      setInitialKm(storedKm);

      // Rehydrate from DB: if there's an open daily_shift_record, sync it
      // using the reactive hook currentShiftRecord instead of manual query.
    }
  }, []);


  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = (selectedVehicle?.stop_reason || "none") as string;
  const storedDriverName = selectedVehicleId
    ? localStorage.getItem(`selected_driver_name_${selectedVehicleId}`) || localStorage.getItem("selectedDriverName")
    : localStorage.getItem("selectedDriverName");
  const loggedDriverName = profile?.full_name?.trim() || "";
  const currentDriverName =
    loggedDriverName ||
    currentShiftRecord?.driver_name?.trim() ||
    storedDriverName?.trim() ||
    selectedVehicle?.driver?.trim() ||
    "Motorista";
  const canIdentifyLoggedDriver = Boolean(loggedDriverName);

  useEffect(() => {
    if (!selectedVehicleId || !profile?.full_name?.trim()) return;
    localStorage.setItem("selectedDriverName", profile.full_name.trim());
    localStorage.setItem(`selected_driver_name_${selectedVehicleId}`, profile.full_name.trim());
  }, [selectedVehicleId, profile?.full_name]);

  // Get the current active stop from history (ended_at is null)
  const activeStop = stopHistory.find((h) => h.ended_at === null);
  const activeServiceDescription =
    (activeStop as any)?.defect_description ||
    (selectedVehicleId ? localStorage.getItem(`active_service_label_${selectedVehicleId}`) : null);

  const statusInfo = getStatusLabel(currentStatus, activeServiceDescription);

  // Check if equipment is in maintenance mode (blocks all other buttons except "Operar")
  const isInMaintenance = currentStatus === "maintenance";
  
  // Check if shift has been started (has initial values)
  const shiftStarted = initialHorimeter !== null && initialKm !== null;

  // Status "Operando" só aparece após o motorista clicar em "Operar".
  // Antes disso (logo após Iniciar Turno) o badge fica em branco.
  const operatingActivated = selectedVehicleId
    ? localStorage.getItem(`operating_activated_${selectedVehicleId}`) === "1"
    : false;
  const showStatusBadge =
    shiftStarted && (currentStatus !== "none" || operatingActivated);

  // Timer effect: start counting from stop_start_time or shift start
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't run timer if end_of_shift or no vehicle or shift not started
    if (!selectedVehicle || currentStatus === "end_of_shift" || !shiftStarted) {
      setElapsedSeconds(0);
      return;
    }

    const shiftStartKey = `shift_start_time_${selectedVehicleId}`;
    let referenceTime: number | null = null;

    if (currentStatus !== "none" && selectedVehicle.stop_start_time) {
      // For non-operating statuses, use stop_start_time
      referenceTime = new Date(selectedVehicle.stop_start_time).getTime();
    } else {
      // For "Operando" (none), use localStorage timestamp
      const stored = localStorage.getItem(shiftStartKey);
      if (stored) {
        referenceTime = parseInt(stored, 10);
      } else {
        // Fallback: save current time as start and use it
        const now = Date.now();
        localStorage.setItem(shiftStartKey, now.toString());
        referenceTime = now;
      }
    }

    if (!referenceTime) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - referenceTime!) / 1000)));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedVehicle?.stop_start_time, currentStatus, selectedVehicleId, selectedVehicle, shiftStarted]);

  const formatElapsedTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const validateEndShiftValues = (): boolean => {
    setEndShiftError(null);
    
    if (initialHorimeter && endShiftHorimeter) {
      const initialH = parseFloat(initialHorimeter);
      const finalH = parseFloat(endShiftHorimeter);
      if (finalH < initialH) {
        setEndShiftError(`Horímetro final (${finalH}) deve ser maior ou igual ao inicial (${initialH})`);
        return false;
      }
    }
    
    if (initialKm && endShiftKm) {
      const initialK = parseFloat(initialKm);
      const finalK = parseFloat(endShiftKm);
      if (finalK < initialK) {
        setEndShiftError(`KM final (${finalK}) deve ser maior ou igual ao inicial (${initialK})`);
        return false;
      }
    }
    
    return true;
  };

  const handleEndOfShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!canIdentifyLoggedDriver) {
      toast.error("Aguarde carregar o motorista logado");
      return;
    }

    if (!validateEndShiftValues()) {
      return;
    }

    if (!acquire(`end_shift:${selectedVehicleId}`)) {
      console.warn("[driver] handleEndOfShift ignorado — já em execução");
      return;
    }

    setIsUpdating(true);
    // Limpa flag de "Operando" — próximo turno começa com badge em branco
    if (selectedVehicleId) {
      localStorage.removeItem(`operating_activated_${selectedVehicleId}`);
    }
    // Idempotência: uma UUID por clique. Se cair na rede e reenviar, o banco rejeita.
    const clientActionId = newClientActionId();
    const { data: uData } = await supabase.auth.getUser();
    const driverAuthId = uData?.user?.id ?? null;
    const begin = await beginDriverAction({
      clientActionId,
      driverId: driverAuthId,
      equipmentId: selectedVehicleId,
      action: "end_shift",
      payload: { endShiftHorimeter, endShiftKm, endShiftFuelLevel },
      isOnline,
    });
    if (begin.ok === false && begin.duplicate === true) {
      console.warn("[driver] end_shift duplicado — ignorado pela fila");
      setIsUpdating(false);
      release(`end_shift:${selectedVehicleId}`);
      return;
    }
    try {
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      // Update the equipment status to end_of_shift
      let statusSuccess = false;
      if (isOnline) {
        try {
          await updateStatus.mutateAsync({
            id: selectedVehicleId,
            stop_reason: "end_of_shift" as any,
            stop_start_time: now,
            previousStopReason: currentStatus as any,
            previousStopStartTime: selectedVehicle.stop_start_time,
            changed_by_driver: currentDriverName || null,
          });
          statusSuccess = true;
        } catch (e) {
          console.warn("Online updateStatus failed, will save offline", e);
        }
      }

      if (!statusSuccess) {
        await addPendingAction("equipment_status", {
          id: selectedVehicleId,
          stop_reason: "end_of_shift",
          stop_start_time: now,
        });
        
        await addPendingAction("stop_history", {
          equipment_id: selectedVehicleId,
          stop_reason: "end_of_shift",
          started_at: now,
          changed_by_driver: currentDriverName || null,
        });

        // Optimistic update
        queryClient.setQueryData(["equipment"], (old: any) => {
          if (!old) return old;
          const newData = old.map((eq: any) =>
            eq.id === selectedVehicleId ? { ...eq, stop_reason: "end_of_shift", stop_start_time: now } : eq
          );
          const env = localStorage.getItem("selected_environment") ?? sessionStorage.getItem("selected_environment");
          localStorage.setItem(`cached_equipment_${env || "default"}`, JSON.stringify(newData));
          return newData;
        });
      }

      // Upsert daily_shift_record com valores finais. Se o registro não existir
      // (ex.: motorista não clicou em iniciar turno), cria agora a partir dos
      // valores de localStorage para que o trigger notify_daily_shift_finalized
      // dispare a mensagem ao grupo e a Parte Diária possa ser gerada.
      const initialHorimeterLs = localStorage.getItem(`shift_horimeter_${selectedVehicleId}`) || null;
      const initialKmLs = localStorage.getItem(`shift_km_${selectedVehicleId}`) || null;
      const shiftStartLs = localStorage.getItem(`shift_start_time_${selectedVehicleId}`);
      const shiftStartIso = shiftStartLs ? new Date(parseInt(shiftStartLs, 10)).toISOString() : now;

      const shiftData = {
        equipment_id: selectedVehicleId,
        equipment_name: selectedVehicle.name,
        plate: selectedVehicle.plate,
        shift_date: today,
        driver_name: currentDriverName || selectedVehicle.driver || "—",
        initial_horimeter: initialHorimeterLs ? parseFloat(initialHorimeterLs) : null,
        initial_km: initialKmLs ? parseFloat(initialKmLs) : null,
        shift_start_time: shiftStartIso,
        final_horimeter: endShiftHorimeter ? parseFloat(endShiftHorimeter) : null,
        final_km: endShiftKm ? parseFloat(endShiftKm) : null,
        final_fuel_level: endShiftFuelLevel,
        shift_end_time: now,
      };

      let savedShiftRecordId = null;
      let shiftSuccess = false;

      if (isOnline) {
        try {
          const { data, error: upsertErr } = await (supabase as any)
            .from("daily_shift_records")
            .upsert(shiftData, { onConflict: "equipment_id,shift_date", ignoreDuplicates: false })
            .select("id")
            .maybeSingle();
          if (upsertErr) throw upsertErr;
          savedShiftRecordId = data?.id || null;
          shiftSuccess = true;
        } catch (err) {
          console.warn("Online upsert shift record failed, will save offline", err);
        }
      }

      if (!shiftSuccess) {
        await addPendingAction("shift_record", {
          ...shiftData,
          update_existing: true,
        });
      }

      // Garante dados frescos do equipamento para decidir/gerar PNG.
      const { data: freshEquipment } = isOnline ? await supabase
        .from("equipment")
        .select("*")
        .eq("id", selectedVehicleId)
        .maybeSingle() : { data: null };
      const equipmentForPng = (freshEquipment as any) || selectedVehicle;
      
      // Parte Diária PNG é gerada para TODOS os equipamentos no fim de turno (padrão).
      // Porém, offline não conseguimos gerar o PNG (pois a edge function precisa do Storage)
      const shouldGeneratePng = isOnline;
      let parteDiariaUrl: string | null = null;
      if (shouldGeneratePng) {
        toast.info("Gerando Parte Diária para envio...");
        let lastErr: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            parteDiariaUrl = await generateAndUploadParteDiariaPng(equipmentForPng as any);
            if (parteDiariaUrl) break;
          } catch (e: any) {
            lastErr = e;
            console.error(`parte diária png tentativa ${attempt} falhou`, e);
            await new Promise((r) => setTimeout(r, 700));
          }
        }
        if (!parteDiariaUrl) {
          toast.error(`Falha ao gerar PNG da Parte Diária: ${lastErr?.message || lastErr || "erro desconhecido"}. Enviando somente texto.`, { duration: 8000 });
        }
      }

      const wapiBody = {
        equipmentId: selectedVehicleId,
        equipmentName: selectedVehicle.name,
        plate: selectedVehicle.plate,
        newStatus: "end_of_shift",
        previousStatus: currentStatus,
        driverName: currentDriverName || null,
        extraInfo: `*Combustível final:* ${getFuelLevelLabel(endShiftFuelLevel)}${endShiftHorimeter ? `\n*Horímetro:* ${endShiftHorimeter}` : ""}${endShiftKm ? `\n*KM:* ${endShiftKm}` : ""}`,
        shiftRecordId: savedShiftRecordId || null,
        imageUrl: parteDiariaUrl,
        imageCaption: parteDiariaUrl ? `📄 *PARTE DIÁRIA*\n${selectedVehicle.name} — ${selectedVehicle.plate}\nMotorista: ${currentDriverName || "—"}` : undefined,
        timestamp: now,
      };
      
      try {
        if (isOnline) {
          const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-driver-status-notify`;
          const resp = await fetch(notifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify(wapiBody),
          });
          if (!resp.ok) console.warn("wapi notify returned", resp.status);
        } else {
          await addPendingAction("wapi_invoke", { functionName: "wapi-driver-status-notify", body: wapiBody });
        }
      } catch (err) {
        console.warn("wapi-driver-status-notify error", err);
      }

      // Fim de Turno does NOT register as equipment exit (saída)
      // The equipment remains on site, only the shift ends

      // Clear driver and helper fields from the equipment to release it for others
      await supabase
        .from("equipment")
        .update({ 
          driver: "",
          helper: ""
        })
        .eq("id", selectedVehicleId);

      // Clear the selected vehicle and shift data from localStorage
      localStorage.removeItem("selectedVehicleId");
      localStorage.removeItem(`shift_horimeter_${selectedVehicleId}`);
      localStorage.removeItem(`shift_km_${selectedVehicleId}`);
      localStorage.removeItem(`shift_start_time_${selectedVehicleId}`);
      setElapsedSeconds(0);

      setShowEndShiftDialog(false);
      
      const details = [
        `Combustível: ${getFuelLevelLabel(endShiftFuelLevel)}`,
        endShiftHorimeter && `Horímetro: ${endShiftHorimeter}`,
        endShiftKm && `KM: ${endShiftKm}`,
      ].filter(Boolean).join(" | ");
      
      toast.success(`Fim de turno registrado. ${details}`);
      void commitDriverAction(clientActionId);
      
      // Navigate to vehicle selection page
      navigate("/selecao-veiculo", { replace: true });
    } catch (error: any) {
      console.error("Error ending shift:", error);
      toast.error("Erro ao registrar fim de turno");
      void failDriverAction(clientActionId, error?.message || String(error));
      void logDriverError({
        action: "end_shift",
        driverName: currentDriverName || null,
        equipmentId: selectedVehicleId,
        equipmentName: selectedVehicle?.name || null,
        errorMessage: error?.message || String(error),
        errorCode: error?.code || null,
        context: {
          endShiftHorimeter,
          endShiftKm,
          endShiftFuelLevel,
          currentStatus,
        },
        isOnline,
      });
    } finally {
      setIsUpdating(false);
      release(`end_shift:${selectedVehicleId}`);
    }
  };

  const handleStartShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!canIdentifyLoggedDriver) {
      toast.error("Aguarde carregar o motorista logado");
      return;
    }

    if (!startShiftHorimeter || !startShiftKm) {
      toast.error("Preencha o Horímetro e KM inicial");
      return;
    }

    if (!acquire(`start_shift:${selectedVehicleId}`)) {
      console.warn("[driver] handleStartShift ignorado — já em execução");
      return;
    }

    setIsUpdating(true);
    // Idempotência: uma UUID por clique.
    const clientActionId = newClientActionId();
    const { data: uData } = await supabase.auth.getUser();
    const driverAuthId = uData?.user?.id ?? null;
    const begin = await beginDriverAction({
      clientActionId,
      driverId: driverAuthId,
      equipmentId: selectedVehicleId,
      action: "start_shift",
      payload: { startShiftHorimeter, startShiftKm, fuelLevel },
      isOnline,
    });
    if (begin.ok === false && begin.duplicate === true) {
      console.warn("[driver] start_shift duplicado — ignorado pela fila");
      setIsUpdating(false);
      release(`start_shift:${selectedVehicleId}`);
      return;
    }
    try {
      // Defensive guard: block double "Iniciar Turno" — if there is already an
      // open daily_shift_record for today (no shift_end_time), the driver must
      // register Fim de Turno first.
      try {
        const { data: openShift, error: shiftError } = await (supabase as any)
          .from("daily_shift_records")
          .select("id")
          .eq("equipment_id", selectedVehicleId)
          .is("shift_end_time", null)
          .order("shift_start_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (shiftError) {
          console.warn("Error checking for open shift:", shiftError);
        } else if (openShift?.id) {
          toast.error("Turno já iniciado hoje. Registre Fim de Turno antes de iniciar novamente.");
          setShowStartShiftDialog(false);
          setIsUpdating(false);
          release(`start_shift:${selectedVehicleId}`);
          return;
        }
      } catch (e) {
        console.warn("open-shift guard check failed", e);
      }

      const now = new Date().toISOString();

      // Save initial values to localStorage
      localStorage.setItem(`shift_horimeter_${selectedVehicleId}`, startShiftHorimeter);
      localStorage.setItem(`shift_km_${selectedVehicleId}`, startShiftKm);
      localStorage.setItem(`shift_start_time_${selectedVehicleId}`, Date.now().toString());
      setInitialHorimeter(startShiftHorimeter);
      setInitialKm(startShiftKm);

      // Create daily shift record in the database
      let startShiftSuccess = false;
      if (isOnline) {
        try {
          await createShiftRecord.mutateAsync({
            equipment_id: selectedVehicleId,
            equipment_name: selectedVehicle.name,
            plate: selectedVehicle.plate,
            driver_name: currentDriverName || "Motorista",
            helper_name: selectedVehicle.helper || undefined,
            initial_horimeter: parseFloat(startShiftHorimeter),
            initial_km: parseFloat(startShiftKm),
            initial_fuel_level: fuelLevel,
          });
          startShiftSuccess = true;
        } catch (e) {
          console.warn("Online createShiftRecord failed, will save offline", e);
        }
      }

      if (!startShiftSuccess) {
        await addPendingAction("shift_record", {
          equipment_id: selectedVehicleId,
          equipment_name: selectedVehicle.name,
          plate: selectedVehicle.plate,
          driver_name: currentDriverName || "Motorista",
          helper_name: selectedVehicle.helper || null,
          shift_date: new Date().toISOString().split("T")[0],
          shift_start_time: new Date().toISOString(),
          initial_horimeter: parseFloat(startShiftHorimeter),
          initial_km: parseFloat(startShiftKm),
          initial_fuel_level: fuelLevel,
          status_history: [
            {
              status: "operando",
              timestamp: new Date().toISOString(),
              changed_by: currentDriverName || "Motorista",
            },
          ],
        });
      }

      // Entry movements are no longer registered automatically at shift start
      // Only exit movements (saída) are tracked in the movements system

      // Notifica o grupo sobre o INÍCIO de TURNO (sem definir status Operando).
      // O status só vai para "Operando" quando o motorista clicar em "Operar".
      try {
        const wapiBody = {
          equipmentId: selectedVehicleId,
          equipmentName: selectedVehicle.name,
          plate: selectedVehicle.plate,
          newStatus: "shift_start",
          previousStatus: "shift_start",
          driverName: currentDriverName || null,
          extraInfo: `*Combustível:* ${getFuelLevelLabel(fuelLevel)}\n*Horímetro:* ${startShiftHorimeter}\n*KM:* ${startShiftKm}`,
          timestamp: new Date().toISOString(),
        };
        if (isOnline) {
          await supabase.functions.invoke("wapi-driver-status-notify", { body: wapiBody });
        } else {
          await addPendingAction("wapi_invoke", { functionName: "wapi-driver-status-notify", body: wapiBody });
        }
      } catch (e) {
        console.warn("driver-status-notify failed", e);
      }

      // Limpa qualquer status anterior — fica em branco até motorista clicar em "Operar"
      localStorage.removeItem(`operating_activated_${selectedVehicleId}`);
      
      if (isOnline) {
        try {
          await updateStatus.mutateAsync({
            id: selectedVehicleId,
            stop_reason: "none",
            stop_start_time: null,
            previousStopReason: (currentStatus as any) || "none",
            previousStopStartTime: selectedVehicle.stop_start_time,
            changed_by_driver: currentDriverName || null,
          });
        } catch (e) {
          // Não bloqueia o início do turno se a atualização de status falhar
          console.warn("updateStatus after start-shift failed", e);
        }
      } else {
        await addPendingAction("equipment_status", {
          id: selectedVehicleId,
          stop_reason: "none",
          stop_start_time: null,
        });
        
        // Optimistic update
        queryClient.setQueryData(["equipment"], (old: any) => {
          if (!old) return old;
          const newData = old.map((eq: any) =>
            eq.id === selectedVehicleId ? { ...eq, stop_reason: "none", stop_start_time: null } : eq
          );
          const env = localStorage.getItem("selected_environment") ?? sessionStorage.getItem("selected_environment");
          localStorage.setItem(`cached_equipment_${env || "default"}`, JSON.stringify(newData));
          return newData;
        });
      }

      setShowStartShiftDialog(false);
      toast.success(`Turno iniciado! Horímetro: ${startShiftHorimeter} | KM: ${startShiftKm}`);
      void commitDriverAction(clientActionId);

      // Após iniciar o turno, vai para a tela de opções (Serviços)
      setTimeout(() => navigate("/servicos-motorista"), 300);

    } catch (error: any) {
      console.error("Error starting shift:", error);
      toast.error("Erro ao iniciar turno");
      void failDriverAction(clientActionId, error?.message || String(error));
      void logDriverError({
        action: "start_shift",
        driverName: currentDriverName || null,
        equipmentId: selectedVehicleId,
        equipmentName: selectedVehicle?.name || null,
        errorMessage: error?.message || String(error),
        errorCode: error?.code || null,
        context: { startShiftHorimeter, startShiftKm, fuelLevel },
        isOnline,
      });
    } finally {
      setIsUpdating(false);
      release(`start_shift:${selectedVehicleId}`);
    }
  };

  const getFuelLevelLabel = (level: FuelLevel): string => {
    const labels: Record<FuelLevel, string> = {
      empty: "Vazio",
      quarter: "1/4",
      half: "1/2",
      three_quarters: "3/4",
      full: "Cheio",
    };
    return labels[level];
  };

  const openStartShiftDialog = async () => {
    if (!selectedVehicleId) {
      toast.error("Nenhum veículo selecionado");
      return;
    }
    setStartShiftHorimeter("");
    setStartShiftKm("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: prevShift } = await supabase
        .from("daily_shift_records")
        .select("final_horimeter, final_km, initial_horimeter, initial_km")
        .eq("equipment_id", selectedVehicleId)
        .lt("shift_date", today)
        .order("shift_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevShift) {
        const horimeter = prevShift.final_horimeter ?? prevShift.initial_horimeter;
        const km = prevShift.final_km ?? prevShift.initial_km;
        if (horimeter) setStartShiftHorimeter(String(horimeter));
        if (km) setStartShiftKm(String(km));
      }
    } catch (err) {
      console.error("Error fetching previous shift data:", err);
    }
    setShowStartShiftDialog(true);
  };

  const handleStatusChange = async (newStatus: DriverStopReason) => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!canIdentifyLoggedDriver) {
      toast.error("Aguarde carregar o motorista logado");
      return;
    }

    // Handle end_of_shift - show dialog instead of immediate action
    if (newStatus === "end_of_shift") {
      // Bloqueia Fim de Turno se o motorista ainda não iniciou o turno
      if (!shiftStarted) {
        toast.error("Você precisa iniciar o turno antes de registrar Fim de Turno");
        return;
      }
      setEndShiftFuelLevel("half"); // Reset to default
      setEndShiftHorimeter(initialHorimeter || ""); // Pre-fill with initial value
      setEndShiftKm(initialKm || ""); // Pre-fill with initial value
      setEndShiftError(null);
      setShowEndShiftDialog(true);
      return;
    }

    // Block any status change if shift has not been started
    if (!shiftStarted) {
      toast.error("Inicie o turno antes de alterar o status");
      return;
    }

    const statusKey = `status:${selectedVehicleId}:${newStatus}`;
    if (!acquire(statusKey)) {
      console.warn("[driver] handleStatusChange ignorado — já em execução", statusKey);
      return;
    }

    // Idempotência: uma UUID por clique. Se cair na rede e reenviar, o banco rejeita.
    const clientActionId = newClientActionId();
    const { data: uData } = await supabase.auth.getUser();
    const driverAuthId = uData?.user?.id ?? null;
    const beginRes = await beginDriverAction({
      clientActionId,
      driverId: driverAuthId,
      equipmentId: selectedVehicleId,
      action: `status_change:${newStatus}`,
      payload: { newStatus, previousStatus: currentStatus },
      isOnline,
    });
    if (beginRes.ok === false && beginRes.duplicate === true) {
      console.warn("[driver] status_change duplicado — ignorado pela fila", statusKey);
      release(statusKey);
      return;
    }

    setIsUpdating(true);
    // Marca que o motorista ativou um status manualmente — habilita o badge "Operando"
    if (selectedVehicleId) {
      localStorage.setItem(`operating_activated_${selectedVehicleId}`, "1");
    }
    const now = new Date().toISOString();
    const statusLabels: Record<string, string> = {
      none: "Operando",
      waiting: "Aguardando Frente",
      rain: "Parado por Chuva",
      end_of_day: "Abastecendo",
      almoco: "Almoço",
      end_of_shift: "Fim de Turno",
    };

    // If offline, save action locally
    if (!isOnline) {
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });
      
      // Also save stop history action
      if (newStatus !== "none") {
        addPendingAction("stop_history", {
          equipment_id: selectedVehicleId,
          stop_reason: newStatus,
          started_at: now,
          changed_by_driver: currentDriverName || null,
        });
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Salvo offline: {statusLabels[newStatus] || newStatus}</span>
        </div>
      );

      // Optimistic update
      queryClient.setQueryData(["equipment"], (old: any) => {
        if (!old) return old;
        const newData = old.map((eq: any) =>
          eq.id === selectedVehicleId ? { ...eq, stop_reason: newStatus, stop_start_time: newStatus !== "none" ? now : null } : eq
        );
        const env = localStorage.getItem("selected_environment") ?? sessionStorage.getItem("selected_environment");
        localStorage.setItem(`cached_equipment_${env || "default"}`, JSON.stringify(newData));
        return newData;
      });

      await commitDriverAction(clientActionId);
      setIsUpdating(false);
      release(statusKey);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: newStatus as any,
        stop_start_time: newStatus !== "none" ? now : null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: currentDriverName || null,
      });

      // Sync status change with daily_shift_records for Parte Diária
      await addStatusToHistory.mutateAsync({
        equipmentId: selectedVehicleId,
        status: newStatus === "none" ? "operando" : newStatus,
          changedBy: currentDriverName || null,
      });

      // Fire-and-forget WhatsApp group notification
      const wapiBody = {
        equipmentId: selectedVehicleId,
        equipmentName: selectedVehicle.name,
        plate: selectedVehicle.plate,
        newStatus,
        previousStatus: currentStatus,
        driverName: currentDriverName || null,
        timestamp: new Date().toISOString(),
      };
      if (isOnline) {
        supabase.functions.invoke("wapi-driver-status-notify", { body: wapiBody }).catch((err) => {
          console.warn("Failed to notify wapi-driver-status-notify", err);
        });
      } else {
        addPendingAction("wapi_invoke", { functionName: "wapi-driver-status-notify", body: wapiBody }).catch(e => console.warn(e));
      }

      toast.success(`Status alterado para: ${statusLabels[newStatus] || newStatus}`);
      await commitDriverAction(clientActionId);
    } catch (error: any) {
      console.error("Error updating status:", error);

      // If online request fails, save offline
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });

      toast.warning("Erro de conexão. Alteração salva para sincronizar depois.");
      void logDriverError({
        action: `status_change:${newStatus}`,
        driverName: currentDriverName || null,
        equipmentId: selectedVehicleId,
        equipmentName: selectedVehicle?.name || null,
        errorMessage: error?.message || String(error),
        errorCode: error?.code || null,
        context: { newStatus, previousStatus: currentStatus },
        isOnline,
      });
      await failDriverAction(clientActionId, error?.message || String(error));
    } finally {
      setIsUpdating(false);
      release(statusKey);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!selectedVehicle) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">Nenhum veículo selecionado</p>
          <p className="text-xs mt-1">Faça login novamente para selecionar um veículo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0 w-full">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-orange-900/40 border border-orange-500/50 rounded-xl p-3 mb-3 flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-orange-500" />
            <p className="text-xs text-orange-200">Modo offline - alterações serão sincronizadas quando conectar</p>
          </div>
        )}

        {/* Maintenance Mode Alert */}
        {isInMaintenance && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-3 mb-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-xs text-red-200">Equipamento em manutenção - apenas "Operar" disponível para retomar</p>
          </div>
        )}

        {/* Info Header (Elapsed time, active service, etc) */}
        {shiftStarted && currentStatus !== "end_of_shift" && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/10">
              <Timer className="h-4 w-4 text-red-500" />
              <span className="text-sm font-mono font-bold text-white">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>
            {currentStatus === ("servico" as any) && activeServiceDescription && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 rounded-lg border border-green-500/50 text-green-400 animate-pulse truncate max-w-[200px]"
                title="Atividade enviada ao grupo do WhatsApp"
              >
                <Wrench className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold truncate">
                  {String(activeServiceDescription).replace(/^Serviço:\s*/i, "")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fuel Card */}
        <section className="po-fuel-card">
          <div className="po-section-title">
            <img src="/assets/icons/svg/fuel.svg" alt="fuel" />
            <span>Nível de combustível</span>
          </div>
          <img className="po-gauge" src="/assets/icons/svg/fuel_gauge.svg" alt="gauge" />
          <div className="po-fuel-controls">
            <button 
              className="po-small-round" 
              onClick={() => {
                const vals = ['E', '1/4', '1/2', '3/4', 'F'];
                const idx = vals.indexOf(fuelLevel);
                if (idx > 0) setFuelLevel(vals[idx - 1] as FuelLevel);
              }}
              disabled={isUpdating}
            >
              ‹
            </button>
            <div className="po-value-pill">{fuelLevel}</div>
            <button 
              className="po-small-round"
              onClick={() => {
                const vals = ['E', '1/4', '1/2', '3/4', 'F'];
                const idx = vals.indexOf(fuelLevel);
                if (idx < vals.length - 1) setFuelLevel(vals[idx + 1] as FuelLevel);
              }}
              disabled={isUpdating}
            >
              ›
            </button>
          </div>
        </section>

        {/* Start Shift Button */}
        {!shiftStarted && (
          <button 
            className="po-start-btn"
            onClick={openStartShiftDialog}
            disabled={isUpdating}
          >
            <span className="po-play">
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <img src="/assets/icons/svg/play.svg" alt="play" />
              )}
            </span>
            INICIAR TURNO
          </button>
        )}

        {/* Status Grid */}
        <section className="po-status-grid">
          {statusButtons.map((button) => {
            const isServices = button.action === ("services" as any);
            const isDisabledByMaintenance = isInMaintenance && !isServices;
            const isDisabledByNoShift = !shiftStarted;
            const isBlocked = isDisabledByMaintenance || isDisabledByNoShift;
            const isCurrentStatus = !isServices && currentStatus === button.action;

            let iconSrc = "";
            let title = button.label.toUpperCase();
            let subtitle = "";
            if (button.action === ("services" as any)) {
              iconSrc = "/assets/icons/svg/wrench.svg";
              subtitle = "Manutenção e apoio";
            } else if (button.action === "waiting") {
              iconSrc = "/assets/icons/svg/clock.svg";
              subtitle = "Em espera";
            } else if (button.action === "rain") {
              iconSrc = "/assets/icons/svg/rain.svg";
              subtitle = "Condições climáticas";
            } else if (button.action === ("almoco" as any)) {
              iconSrc = "/assets/icons/svg/utensils.svg";
              subtitle = "Intervalo";
            } else {
              // fallback for other dynamic status
              iconSrc = "/assets/icons/svg/clock.svg"; 
              subtitle = "Outro status";
            }

            return (
              <div 
                key={button.id}
                className={`po-status ${isCurrentStatus ? "active" : ""} ${(isBlocked && !isCurrentStatus) ? "opacity-50 grayscale" : ""}`}
                onClick={() => {
                  if (!canIdentifyLoggedDriver) {
                    toast.error("Aguarde carregar o motorista logado");
                    return;
                  }
                  if (isDisabledByNoShift) {
                    toast.error("Inicie o turno para usar este botão");
                    return;
                  }
                  if (isDisabledByMaintenance && !isServices) {
                    toast.error("Equipamento em manutenção. Apenas Serviços disponível.");
                    return;
                  }
                  if (isServices) {
                    setServicesOpen(true);
                    return;
                  }
                  if (isCurrentStatus) return; // Prevent clicking already active status
                  void confirmOnce(
                    `status:${selectedVehicleId ?? "x"}:${button.action}`,
                    `Tem certeza que deseja selecionar "${button.label}"?`,
                    async () => {
                      await handleStatusChange(button.action);
                    },
                  );
                }}
              >
                <span className="po-bubble">
                  {isUpdating && !isServices && submittingServiceId === button.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <img src={iconSrc} alt={title} />
                  )}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </div>
                <img className="po-chev" src="/assets/icons/svg/chevron.svg" alt=">" />
              </div>
            );
          })}
        </section>

        {/* End Shift Button */}
        <button 
          className={`po-end-btn ${currentStatus === "end_of_shift" ? "opacity-50 cursor-not-allowed border-red-500" : ""}`}
          disabled={isUpdating || isProfileLoading || !canIdentifyLoggedDriver || currentStatus === "end_of_shift"}
          onClick={() => {
            if (!canIdentifyLoggedDriver) {
              toast.error("Aguarde carregar o motorista logado");
              return;
            }
            if (!shiftStarted) {
              toast.error("Inicie o turno para usar este botão");
              return;
            }
            if (isInMaintenance) {
              toast.error("Equipamento em manutenção. Apenas Serviços disponível.");
              return;
            }
            void confirmOnce(
              `status:${selectedVehicleId ?? "x"}:end_of_shift`,
              'Tem certeza que deseja selecionar "Fim de Turno"?',
              async () => {
                await handleStatusChange("end_of_shift" as StopReason);
              },
            );
          }}
        >
          {isUpdating ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <img src="/assets/icons/svg/power.svg" alt="power" />
          )}
          FIM DE TURNO
        </button>
      </div>

      {/* Start Shift Dialog with Horimeter and KM */}
      <Dialog open={showStartShiftDialog} onOpenChange={setShowStartShiftDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              Iniciar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados iniciais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Legend */}
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Registre o horímetro e quilometragem antes de iniciar o turno. 
                Estes valores serão usados para validação no fim do turno.
              </AlertDescription>
            </Alert>

            {/* Horimeter and KM inputs - auto-filled from previous day */}
            {startShiftHorimeter && startShiftKm && (
              <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <Info className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-300">
                  Valores preenchidos automaticamente com o final do dia anterior.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-horimeter"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  placeholder="Ex: 1234"
                  value={startShiftHorimeter}
                  onChange={(e) => setStartShiftHorimeter(e.target.value.replace(/[^\d.,]/g, ""))}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!startShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-km"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ex: 45678"
                  value={startShiftKm}
                  onChange={(e) => setStartShiftKm(e.target.value.replace(/\D/g, ""))}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!startShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStartShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartShift}
              disabled={isUpdating || !startShiftHorimeter || !startShiftKm}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Shift Dialog with Fuel Level, Horimeter and KM */}
      <Dialog open={showEndShiftDialog} onOpenChange={setShowEndShiftDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Finalizar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados finais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fuel Level Gauge */}
            <div className="flex justify-center">
              <FuelLevelGauge
                selectedLevel={endShiftFuelLevel}
                onLevelChange={setEndShiftFuelLevel}
                disabled={isUpdating}
              />
            </div>

            {/* Legend showing initial values */}
            {(initialHorimeter || initialKm) && (
              <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Valores iniciais do turno:</strong>
                  <br />
                  Horímetro: {initialHorimeter || "N/A"} | KM: {initialKm || "N/A"}
                  <br />
                  <span className="text-[10px]">Os valores finais devem ser iguais ou maiores que os iniciais.</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Error message */}
            {endShiftError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {endShiftError}
                </AlertDescription>
              </Alert>
            )}

            {/* Horimeter and KM inputs - REQUIRED */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="horimeter"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  placeholder={initialHorimeter ? `Mín: ${initialHorimeter}` : "Ex: 1234"}
                  value={endShiftHorimeter}
                  onChange={(e) => {
                    setEndShiftHorimeter(e.target.value.replace(/[^\d.,]/g, ""));
                    setEndShiftError(null);
                  }}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!endShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="km"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={initialKm ? `Mín: ${initialKm}` : "Ex: 45678"}
                  value={endShiftKm}
                  onChange={(e) => {
                    setEndShiftKm(e.target.value.replace(/\D/g, ""));
                    setEndShiftError(null);
                  }}
                  onFocus={(e) => setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />

                {!endShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEndOfShift}
              disabled={isUpdating || !endShiftHorimeter || !endShiftKm}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              Confirmar Fim de Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Services Selection Dialog - inline list so motorista escolhe a atividade */}
      <Dialog open={servicesOpen} onOpenChange={(o) => !submittingServiceId && setServicesOpen(o)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Selecione o Serviço
            </DialogTitle>
            <DialogDescription>
              O serviço aparecerá na Parte Diária e será enviado ao grupo do WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2.5 py-2">
            {[
              { id: "lavagem_mirante", label: "Lavagem Mirante", icon: <Waves className="h-5 w-5" />, color: "bg-cyan-600 hover:bg-cyan-700" },
              { id: "irrigacao_carretel", label: "Irrigação Carretel", icon: <Droplets className="h-5 w-5" />, color: "bg-blue-600 hover:bg-blue-700" },
              { id: "irrigacao_faixa_3_4", label: "Irrigação FAIXA 3 e 4", icon: <Sprout className="h-5 w-5" />, color: "bg-emerald-600 hover:bg-emerald-700" },
              { id: "abastecimento_tanque_irrigacao", label: "Abastecimento do Tanque de Irrigação", icon: <Fuel className="h-5 w-5" />, color: "bg-indigo-600 hover:bg-indigo-700" },
              { id: "lavagem_vertedouro", label: "Lavagem Vertedouro", icon: <Waves className="h-5 w-5" />, color: "bg-teal-600 hover:bg-teal-700" },
              { id: "umectacao_vias", label: "Umectação de Vias", icon: <CloudDrizzle className="h-5 w-5" />, color: "bg-sky-600 hover:bg-sky-700" },
              { id: "lavagem_carro", label: "Lavagem de Carro", icon: <CarFront className="h-5 w-5" />, color: "bg-slate-600 hover:bg-slate-700" },
            ].map((s) => {
              const loading = submittingServiceId === s.id;
              return (
                <Button
                  key={s.id}
                  type="button"
                  variant="outline"
                    disabled={!!submittingServiceId || isProfileLoading || !canIdentifyLoggedDriver}
                  className={`h-auto min-h-[56px] py-3 px-3 flex items-center justify-start gap-3 text-white border-transparent ${s.color}`}
                  onClick={async () => {
                    if (!selectedVehicleId || !selectedVehicle) {
                      toast.error("Nenhum veículo selecionado");
                      return;
                    }
                    if (!canIdentifyLoggedDriver) {
                      toast.error("Aguarde carregar o motorista logado");
                      return;
                    }
                    setSubmittingServiceId(s.id);
                    const now = new Date().toISOString();
                    const wapiBody = {
                      equipmentId: selectedVehicleId,
                      equipmentName: selectedVehicle.name,
                      plate: selectedVehicle.plate,
                      newStatus: "servico",
                      previousStatus: selectedVehicle.stop_reason || "none",
                      driverName: currentDriverName || null,
                      extraInfo: `*Serviço:* ${s.label}`,
                      timestamp: now,
                    };

                    if (!isOnline) {
                      addPendingAction("equipment_status", {
                        id: selectedVehicleId,
                        stop_reason: "servico",
                        stop_start_time: now,
                      }).catch(e => console.warn(e));
                      addPendingAction("stop_history", {
                        equipment_id: selectedVehicleId,
                        stop_reason: "servico",
                        started_at: now,
                        changed_by_driver: currentDriverName || null,
                        defect_description: `Serviço: ${s.label}`,
                      }).catch(e => console.warn(e));
                      addPendingAction("wapi_invoke", {
                        functionName: "wapi-driver-status-notify",
                        body: wapiBody,
                      }).catch(e => console.warn(e));
                      
                      localStorage.setItem(`active_service_${selectedVehicleId}`, s.id);
                      localStorage.setItem(`active_service_label_${selectedVehicleId}`, `Serviço: ${s.label}`);
                      toast.success(`Serviço salvo offline: ${s.label}`);
                      setServicesOpen(false);
                      setSubmittingServiceId(null);
                      return;
                    }

                    try {
                      await updateStatus.mutateAsync({
                        id: selectedVehicleId,
                        stop_reason: "servico" as any,
                        stop_start_time: now,
                        previousStopReason: (selectedVehicle.stop_reason as any) || "none",
                        previousStopStartTime: selectedVehicle.stop_start_time,
                        defect_description: `Serviço: ${s.label}`,
                        changed_by_driver: currentDriverName || null,
                      } as any);
                      localStorage.setItem(`active_service_${selectedVehicleId}`, s.id);
                      localStorage.setItem(`active_service_label_${selectedVehicleId}`, `Serviço: ${s.label}`);
                      
                      supabase.functions.invoke("wapi-driver-status-notify", { body: wapiBody }).catch((err) => {
                        console.warn("Failed to notify wapi-driver-status-notify", err);
                      });
                      toast.success(`Serviço selecionado: ${s.label}`);
                      setServicesOpen(false);
                    } catch (err: any) {
                      console.error(err);
                      addPendingAction("equipment_status", {
                        id: selectedVehicleId,
                        stop_reason: "servico",
                        stop_start_time: now,
                      }).catch(e => console.warn(e));
                      addPendingAction("stop_history", {
                        equipment_id: selectedVehicleId,
                        stop_reason: "servico",
                        started_at: now,
                        changed_by_driver: currentDriverName || null,
                        defect_description: `Serviço: ${s.label}`,
                      }).catch(e => console.warn(e));
                      addPendingAction("wapi_invoke", {
                        functionName: "wapi-driver-status-notify",
                        body: wapiBody,
                      }).catch(e => console.warn(e));
                      
                      localStorage.setItem(`active_service_${selectedVehicleId}`, s.id);
                      localStorage.setItem(`active_service_label_${selectedVehicleId}`, `Serviço: ${s.label}`);
                      toast.warning(`Erro de conexão. Serviço ${s.label} salvo para sincronizar depois.`);
                      setServicesOpen(false);
                    } finally {
                      setSubmittingServiceId(null);
                    }
                  }}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : s.icon}
                  <span className="text-sm font-semibold text-left flex-1">{s.label}</span>
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setServicesOpen(false)}
              disabled={!!submittingServiceId}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
