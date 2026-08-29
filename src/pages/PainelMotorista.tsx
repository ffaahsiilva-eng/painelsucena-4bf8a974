import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  
  // Force light theme on this page
  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    
    return () => {
      // Restore previous theme when leaving the page
      if (previousTheme) {
        setTheme(previousTheme);
      }
    };
  }, []);

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      
      {/* Compact Header for Mobile */}
      <header className="sticky top-0 z-10 bg-card/95  border-b shadow-sm safe-area-inset-top shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Logo */}
          <img loading="lazy" decoding="async" 
            src="/logo-sucena-pdf.png" 
            alt="Sucena" 
            className="h-6 w-auto"
          />
          
          {/* User Info - Center */}
          <div className="flex items-center gap-2 flex-1 justify-center min-w-0 px-1">
            <NeonAvatar
              src={profile?.avatar_url}
              name={profile?.full_name || "Motorista"}
              frameColor={profile?.frame_color}
              neonColor={profile?.neon_color}
              frameAnimation={profile?.frame_animation}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[140px] sm:max-w-[180px]">
                {profile?.full_name?.split(' ')[0] || "Motorista"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                {formatCargoLabel(profile?.cargo)}
              </p>
            </div>
          </div>
          
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
          
          {/* Reload Button - clears all caches and reloads */}
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              const ok = window.confirm(
                "Recarregar e atualizar o aplicativo?\n\nIsso vai limpar o cache, dados locais e baixar a versão mais recente. Você precisará entrar novamente.",
              );
              if (!ok) return;
              toast.info("Atualizando o aplicativo…");
              await nukeAndReload();
            }}
            className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/10 rounded-full shrink-0 touch-manipulation ml-1"
            title="Recarregar e atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0 touch-manipulation ml-1"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content - Scrollable container */}
      <main className="flex-1">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-safe-area safe-area-inset-bottom">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-full">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  Olá, {profile?.full_name?.split(' ')[0] || "Motorista"}!
                </h2>
                <p className="text-xs opacity-90">
                  Acesse as funções do seu dia a dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Helper Name Display */}
        {selectedVehicle?.helper && selectedVehicle.helper.trim() !== "" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Seu Ajudante é <span className="font-bold text-blue-600">{selectedVehicle.helper}</span>
            </p>
          </div>
        )}

        {/* Change equipment without ending the shift - only available before starting shift */}
        {!shiftStarted && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-10 text-sm border-amber-400 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Trocar Equipamento
            </Button>
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

        {/* Quick Access Grid - 2 columns, touch-friendly with larger targets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
          {quickAccessItems
            .filter((item) => !(item.hideForMunk && isMunk))
            .filter((item) => !(item.hideWhenExitPending && exitPending))
            .map((item) => {
              const blocked = item.requiresShift && !shiftStarted;
              return (
                <button
                  key={item.title}
                  type="button"
                  disabled={blocked}
                  className={`${item.color} transition-all duration-150 border-none shadow-md touch-manipulation rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    blocked
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
                  }`}
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
                  <div className="p-4 flex flex-col items-center justify-center text-center min-h-[90px] sm:min-h-[110px] pointer-events-none">
                    <div className={`${item.iconColor} mb-2 pointer-events-none`}>
                      {item.icon}
                    </div>
                    <h3 className={`font-bold ${item.iconColor} text-xs uppercase tracking-wide pointer-events-none`}>
                      {item.title}
                    </h3>
                  </div>
                </button>
              );
            })}

          {/* Check List - opens modal dialog */}
          <VehicleChecklistDialog
            equipmentId={selectedVehicleId}
            equipmentName={selectedVehicle?.name}
            plate={selectedVehicle?.plate}
            trigger={
              <button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-all duration-150 border-none shadow-md touch-manipulation rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
              >
                <div className="p-4 flex flex-col items-center justify-center text-center min-h-[90px] sm:min-h-[110px] pointer-events-none">
                  <div className="text-white mb-2 pointer-events-none">
                    <ClipboardCheck className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wide pointer-events-none">
                    Check List
                  </h3>
                </div>
              </button>
            }
          />

          {/* Abastecendo - status quick action */}
          <AbastecendoQuickButton />


        </div>
        </div>
      </main>
    </div>
  );
};

export default PainelMotorista;
