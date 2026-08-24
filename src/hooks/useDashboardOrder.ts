import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type DashboardItemId = 
  | "birthday"
  | "matrix_alert"
  | "campaign"
  | "reminder"
  | "order"
  | "vehicle_expiry"
  | "document_expiry"
  | "sling_inspection"
  | "dds"
  | "equipment"
  | "stats"
  | "matrix_chart";

export const DEFAULT_DASHBOARD_ORDER: DashboardItemId[] = [
  "birthday",
  "dds",
  "reminder",
  "matrix_alert",
  "order",
  "vehicle_expiry",
  "document_expiry",
  "sling_inspection",
  "campaign",
  "equipment",
  "stats",
  "matrix_chart",
];

export const DASHBOARD_ITEM_LABELS: Record<DashboardItemId, string> = {
  birthday: "Aniversariantes",
  matrix_alert: "Alerta da Matriz",
  campaign: "Campanha de Saúde",
  reminder: "Lembretes",
  order: "Pedidos",
  vehicle_expiry: "Vistoria de Veículos",
  document_expiry: "Documentos Vencendo",
  sling_inspection: "Vistoria de Cintas",
  dds: "DDS do Dia",
  equipment: "Status de Equipamentos",
  stats: "Estatísticas",
  matrix_chart: "Progresso da Matriz",
};

export const useDashboardOrder = () => {
  const { user } = useAuth();
  const [dashboardOrder, setDashboardOrder] = useState<DashboardItemId[]>(DEFAULT_DASHBOARD_ORDER);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("dashboard_order")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.dashboard_order && Array.isArray(data.dashboard_order)) {
        // Validate that all items are valid
        const validOrder = (data.dashboard_order as string[]).filter(
          (item): item is DashboardItemId => 
            DEFAULT_DASHBOARD_ORDER.includes(item as DashboardItemId)
        );
        
        // Add any missing items at the end
        const missingItems = DEFAULT_DASHBOARD_ORDER.filter(
          item => !validOrder.includes(item)
        );
        
        setDashboardOrder([...validOrder, ...missingItems]);
      }
    } catch (error) {
      console.error("Error fetching dashboard order:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateOrder = async (newOrder: DashboardItemId[]): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { 
            user_id: user.id, 
            dashboard_order: newOrder,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setDashboardOrder(newOrder);
      return true;
    } catch (error) {
      console.error("Error updating dashboard order:", error);
      return false;
    }
  };

  const resetToDefault = async (): Promise<boolean> => {
    return updateOrder(DEFAULT_DASHBOARD_ORDER);
  };

  return {
    dashboardOrder,
    updateOrder,
    resetToDefault,
    isLoading,
  };
};
