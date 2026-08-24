import { useProfile } from "./useProfile";
import { useIsAdmin } from "./useUserRole";

export const useInventoryPermissions = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = profileLoading || adminLoading;

  const isVisualizador = profile?.cargo === "visualizador";

  // Aux administrativo, Aux almoxarifado and Admin can edit Estoque, but never visualizador
  const canEditInventory = !isVisualizador && (isAdmin || profile?.cargo === "aux_administrativo" || profile?.cargo === "aux_almoxarifado");

  return {
    canEditInventory,
    isVisualizador,
    isLoading,
  };
};
