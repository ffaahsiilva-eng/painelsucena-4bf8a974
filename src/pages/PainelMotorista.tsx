import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import "@/styles/painel-operacao.css";
import { 
  FileText, 
  Truck, 
  MapPin,
  LogOut,
  User,
  Droplets,
  UserCheck,
  RefreshCw,
  ClipboardCheck
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/useProfile";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { confirmOnce } from "@/lib/pendingConfirm";
import { nukeAndReload } from "@/lib/appRefresh";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { DriverStatusButtons } from "@/components/driver/DriverStatusButtons";
import { VehicleChecklistDialog } from "@/components/driver/VehicleChecklistDialog";
import { AbastecendoQuickButton } from "@/components/driver/AbastecendoQuickButton";
import { SyncIndicatorV2 } from "@/components/driver/SyncIndicatorV2";
import { OfflineBanner } from "@/components/driver/OfflineFeedback";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";

interface QuickAccessItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  iconColor: string;
  hideForMunk?: boolean;
  hideWhenExitPending?: boolean;
  requiresShift?: boolean;
}


const PainelMotorista = () => {
  const { setTheme, theme } = useTheme();
  
  // Removed light theme constraint for new dark industrial UI

  // Note: when equipment exit is pending we no longer force redirect to entry page.
  // The driver can keep managing the shift (Início de Turno, Operar, Abastecendo,
  // Fim de Turno) from the painel even with the equipment registered as saída.
  // The SAÍDA button on the entry/exit screen is blocked while the equipment is out.
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: equipment = [] } = useEquipment();
  const { data: equipmentCurrentlyOut = [] } = useEquipmentCurrentlyOut();
  const { isOnline, isSyncing, pendingCount, lastSyncTime, syncError, isInitialized, triggerSync } = useOfflineSyncV2();
  const { environment } = useEnvironment();
  const { signOut } = useAuth();
  const currentEnv = environment || "barcarena";
  
  // Realtime listener for administrative reset
  useEffect(() => {
    const channel = supabase.channel(`driver_force_logout_${currentEnv}`)
      .on('broadcast', { event: 'force_logout' }, () => {
        toast.info("O administrador realizou um reset no painel. Você será desconectado.", {
          duration: 5000,
          id: "admin-reset-toast"
        });
        
        // Clear local selection state
        localStorage.removeItem("selectedVehicleId");
        
        // Wait a moment for the toast then sign out
        setTimeout(async () => {
          await signOut();
          navigate("/auth", { replace: true });
        }, 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEnv, signOut, navigate]);
  
  // Get selected vehicle type
  const selectedVehicleId = localStorage.getItem("selectedVehicleId");
  const selectedVehicle = equipment.find(eq => eq.id === selectedVehicleId);
  const isMunk = selectedVehicle?.equipment_type === "munk";

  useEffect(() => {
    if (!selectedVehicleId || !selectedVehicle || !profile?.full_name) return;

    const equipmentDriver = (selectedVehicle.driver || "").trim();
    const loggedDriver = profile.full_name.trim();
    const cachedDriver = (
      localStorage.getItem(`selected_driver_name_${selectedVehicleId}`) ||
      localStorage.getItem("selectedDriverName") ||
      ""
    ).trim();

    const belongsToAnotherDriver =
      (equipmentDriver && equipmentDriver !== loggedDriver) ||
      (!equipmentDriver && cachedDriver && cachedDriver !== loggedDriver);

    if (!belongsToAnotherDriver) return;

    localStorage.removeItem("selectedVehicleId");
    localStorage.removeItem("selectedDriverName");
    localStorage.removeItem("selectedVehicleUserId");
    localStorage.removeItem(`selected_driver_name_${selectedVehicleId}`);
    localStorage.removeItem(`selected_vehicle_user_${selectedVehicleId}`);
    toast.error("Este equipamento está vinculado a outro motorista. Selecione seu equipamento.");
    navigate("/selecao-veiculo", { replace: true });
  }, [navigate, profile?.full_name, selectedVehicle, selectedVehicleId]);

  // Equipment is "out" if DB says so OR localStorage flag is set (offline fallback)
  const isEquipmentOutDb = selectedVehicle
    ? equipmentCurrentlyOut.some((m: any) => m.plate === selectedVehicle.plate)
    : false;

  // Check if shift has been started (mirrors DriverStatusButtons logic)
  const [shiftStarted, setShiftStarted] = useState(false);
  const [exitPendingLocal, setExitPendingLocal] = useState(
    () => localStorage.getItem("equipmentExitPending") === "true",
  );
  useEffect(() => {
    const check = () => {
      setExitPendingLocal(localStorage.getItem("equipmentExitPending") === "true");
      if (!selectedVehicleId) return setShiftStarted(false);
      const h = localStorage.getItem(`shift_horimeter_${selectedVehicleId}`);
      const k = localStorage.getItem(`shift_km_${selectedVehicleId}`);
      setShiftStarted(h !== null && k !== null);
    };
    check();
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(interval);
    };
  }, [selectedVehicleId]);

  const exitPending = exitPendingLocal || isEquipmentOutDb;

  // Keep localStorage in sync with DB so other components see the flag
  useEffect(() => {
    if (isEquipmentOutDb && localStorage.getItem("equipmentExitPending") !== "true") {
      localStorage.setItem("equipmentExitPending", "true");
      setExitPendingLocal(true);
    }
  }, [isEquipmentOutDb]);


  // Geolocation tracking
  const { permissionStatus, requestPermission } = useDriverGeolocation(selectedVehicleId);

  // Request location permission on mount
  useEffect(() => {
    if (permissionStatus === "prompt") {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  const handleLogout = async () => {
    try {
      // IMPORTANT: do NOT clear selectedVehicleId / driver / helper on logout.
      // The vehicle selection (and ajudante) must persist across logins until
      // the driver explicitly registers Fim de Turno. Fim de Turno is the only
      // place that clears localStorage and the driver/helper fields on the
      // equipment. This way, if the equipment is currently registered as saída
      // (e.g. manutenção corretiva), the driver returns straight to the painel
      // with the shift control options instead of having to re-select the
      // equipment and re-enter the helper name.
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return "MT";
  };

  const quickAccessItems: QuickAccessItem[] = [
    {
      title: "Relatórios",
      icon: <FileText className="w-8 h-8" />,
      href: "/relatorios-motorista",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Equipamentos",
      icon: <Truck className="w-8 h-8" />,
      href: "/equipamentos-motorista",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Pontos de Água",
      icon: <Droplets className="w-8 h-8" />,
      href: "/pontos-abastecimento",
      color: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
      iconColor: "text-white",
      hideForMunk: true,
    },
    {
      title: "Entrada/Saída",
      icon: <MapPin className="w-8 h-8" />,
      href: "/registro-movimento-motorista",
      color: "bg-zinc-600 hover:bg-zinc-700 active:bg-zinc-800",
      iconColor: "text-white",
      requiresShift: true,
    },
  ];

  return (
    <div className="driver-panel-v6">
      <div className="po-app">
      {/* Header */}
      <header className="po-header">
        <div className="po-profile-group">
          <div className="po-avatar-container">
            <NeonAvatar
              src={profile?.avatar_url}
              name={profile?.full_name || "Motorista"}
              frameColor={profile?.frame_color}
              neonColor={profile?.neon_color}
              frameAnimation={profile?.frame_animation}
              size="sm"
            />
          </div>
          <div className="po-driver-info">
            <h2 id="driverName">{profile?.full_name?.split(' ')[0] || "Motorista"}</h2>
            <span className="po-truck-badge" id="vehiclePlate">
              {selectedVehicle?.plate || "Sem veículo"}
            </span>
          </div>
        </div>
        <div className="po-header-actions">
          {/* Sync Indicator */}
          <SyncIndicatorV2
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            lastSyncTime={lastSyncTime}
            syncError={syncError}
            isInitialized={isInitialized}
            onSync={triggerSync}
          />
          <button 
            className="po-icon-btn" 
            onClick={async () => {
              const ok = window.confirm(
                "Recarregar e atualizar o aplicativo?\n\nIsso vai limpar o cache, dados locais e baixar a versão mais recente. Você precisará entrar novamente.",
              );
              if (!ok) return;
              toast.info("Atualizando o aplicativo…");
              await nukeAndReload();
            }}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="po-icon-btn po-danger" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="po-main pb-safe-area safe-area-inset-bottom">
        
        {/* Helper Name Display */}
        {selectedVehicle?.helper && selectedVehicle.helper.trim() !== "" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/40 border border-blue-500/30 rounded-xl mb-4">
            <UserCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-sm font-medium text-white">
              Ajudante: <span className="font-bold text-blue-400">{selectedVehicle.helper}</span>
            </p>
          </div>
        )}

        {/* Change equipment without ending the shift */}
        {!shiftStarted && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full h-12 mb-4 rounded-xl text-sm font-bold border-2 border-amber-500/50 text-amber-500 flex items-center justify-center gap-2 hover:bg-amber-500/10 transition-colors">
              <RefreshCw className="w-4 h-4" />
              TROCAR EQUIPAMENTO
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Trocar de equipamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Você voltará para a tela de seleção de equipamento sem precisar registrar Fim de Turno.
                O ajudante atual será desvinculado para que você selecione outro equipamento.
                Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    if (selectedVehicleId) {
                      await supabase
                        .from("equipment")
                        .update({ driver: "", helper: "" })
                        .eq("id", selectedVehicleId);
                    }
                  } catch (e) {
                    console.warn("Falha ao limpar motorista/ajudante:", e);
                  }
                  localStorage.removeItem("selectedVehicleId");
                  toast.success("Selecione um novo equipamento");
                  navigate("/selecao-veiculo", { replace: true });
                }}
              >
                Sim, trocar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}

        {/* Driver Status Buttons - Controle de Turno */}
        <DriverStatusButtons />

        {/* Menu Grid */}
        <section className="po-menu-grid">
          {quickAccessItems
            .filter((item) => !(item.hideForMunk && isMunk))
            .filter((item) => !(item.hideWhenExitPending && exitPending))
            .map((item) => {
              const blocked = item.requiresShift && !shiftStarted;
              return (
                <div
                  key={item.title}
                  className={`po-menu-item ${blocked ? "opacity-40 grayscale" : ""}`}
                  onClick={() => {
                    if (blocked) {
                      toast.error("Inicie o turno antes de acessar essa função");
                      return;
                    }
                    if (!shiftStarted) {
                      navigate(item.href);
                      return;
                    }
                    void confirmOnce(
                      `nav:${item.href}`,
                      `Tem certeza que deseja selecionar "${item.title}"?`,
                      () => {
                        navigate(item.href);
                      },
                    );
                  }}
                >
                  <div className={`mb-1 ${item.iconColor || "text-white"}`}>
                    {item.icon}
                  </div>
                  <span>{item.title}</span>
                </div>
              );
            })}

          {/* Check List - opens modal dialog */}
          <VehicleChecklistDialog
            equipmentId={selectedVehicleId}
            equipmentName={selectedVehicle?.name}
            plate={selectedVehicle?.plate}
            trigger={
              <div className="po-menu-item" style={{ background: "linear-gradient(145deg, #f97316, #c2410c)" }}>
                <div className="mb-1 text-white">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <span>CHECK LIST</span>
              </div>
            }
          />

          {/* Abastecendo - status quick action */}
          <div className="po-menu-item-wrapper">
             <AbastecendoQuickButton />
          </div>
        </section>

      </main>
    </div>
    </div>
  );
};

export default PainelMotorista;
