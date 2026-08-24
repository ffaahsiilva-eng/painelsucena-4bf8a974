import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { RotateCcw, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export const ClearEquipmentDialog = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  const handleClearEquipment = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      // 1. Execute full administrative reset via RPC
      const { data: resetResult, error: resetError } = await supabase
        .rpc('rpc_admin_full_reset', {
          p_admin_user_id: user.id,
          p_environment: currentEnv
        });

      if (resetError) throw resetError;
      
      const result = resetResult as { ok: boolean; error?: string; closed_shifts: number; updated_equipment: number };
      if (!result.ok) {
        throw new Error(result.error || "Erro ao executar reset administrativo.");
      }

      // 2. Clear local storage for this device
      localStorage.removeItem("selectedVehicleId");

      // 3. Trigger Realtime Broadcast so all drivers are kicked/refreshed
      const channel = supabase.channel(`driver_force_logout_${currentEnv}`);
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'force_logout',
            payload: { message: 'Reset administrativo realizado.' }
          });
          supabase.removeChannel(channel);
        }
      });

      // 4. Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });

      toast.success(`Reset concluído! ${result.closed_shifts} turnos encerrados e ${result.updated_equipment} equipamentos liberados.`);
      
      // 5. Sign out the admin
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      console.error("Erro ao realizar reset administrativo:", error);
      toast.error(error.message || "Erro ao realizar reset administrativo");
    } finally {
      setIsClearing(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Administrativo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" />
            Reset Administrativo do Painel
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Esta operação irá executar um reset completo no sistema de motoristas para o ambiente <strong>{currentEnv.toUpperCase()}</strong>:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Encerrar <strong>TODOS</strong> os turnos ativos agora</li>
              <li>Liberar <strong>TODOS</strong> os equipamentos (remover motoristas/ajudantes)</li>
              <li>Desconectar <strong>TODOS</strong> os motoristas logados</li>
              <li>Limpar cache e seleções locais</li>
            </ul>
            <p className="mt-3 font-medium text-destructive">
              Atenção: Esta ação é irreversível e será registrada na auditoria.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="touch-manipulation">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearEquipment}
            disabled={isClearing}
            className="bg-orange-500 hover:bg-orange-600 touch-manipulation"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar Tudo
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
