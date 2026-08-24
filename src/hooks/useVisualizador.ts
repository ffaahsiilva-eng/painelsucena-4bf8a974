import { useProfile } from "./useProfile";

export const useIsVisualizador = () => {
  const { data: profile, isLoading } = useProfile();
  return {
    isVisualizador: profile?.cargo === "visualizador",
    isLoading,
  };
};
