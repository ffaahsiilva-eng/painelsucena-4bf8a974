import { createContext, useContext, ReactNode, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";

interface VisualizadorContextType {
  isVisualizador: boolean;
  isLoading: boolean;
}

const VisualizadorContext = createContext<VisualizadorContextType>({
  isVisualizador: false,
  isLoading: true,
});

export const useVisualizadorContext = () => useContext(VisualizadorContext);

export const VisualizadorProvider = ({ children }: { children: ReactNode }) => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isVisualizador: isVisualizadorRole, isLoading: roleLoading } = useIsAdmin();

  const value = useMemo(() => ({
    isVisualizador: profile?.cargo === "visualizador" || isVisualizadorRole,
    isLoading: profileLoading || roleLoading,
  }), [profile?.cargo, isVisualizadorRole, profileLoading, roleLoading]);

  return (
    <VisualizadorContext.Provider value={value}>
      {children}
    </VisualizadorContext.Provider>
  );
};
