import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Order } from "@/hooks/useOrders";
import { getBrazilNorthDate } from "@/lib/timezone";
import { differenceInDays, parseISO, isSameDay } from "date-fns";

interface OrderHighlight extends Order {
  showReason: "7_days_before" | "delivery_day";
}

export const useOrderHighlights = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["order-highlights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's orders with expected dates
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("requester_id", user.id)
        .not("expected_date", "is", null)
        .in("status", ["solicitado", "aprovado", "a_caminho"])
        .order("expected_date", { ascending: true });

      if (error) throw error;
      if (!orders) return [];

      const today = getBrazilNorthDate();
      const highlights: OrderHighlight[] = [];

      // Get acknowledged orders from localStorage
      const acknowledgedKey = `order_highlights_acknowledged_${user.id}`;
      const acknowledged: Record<string, string> = JSON.parse(
        localStorage.getItem(acknowledgedKey) || "{}"
      );

      orders.forEach((order) => {
        if (!order.expected_date) return;

        const expectedDate = parseISO(order.expected_date);
        const daysUntil = differenceInDays(expectedDate, today);
        const isDeliveryDay = isSameDay(expectedDate, today);

        // Check if it's delivery day - always show
        if (isDeliveryDay) {
          highlights.push({ ...order, showReason: "delivery_day" } as OrderHighlight);
          return;
        }

        // Check if within 7 days and not acknowledged
        if (daysUntil > 0 && daysUntil <= 7) {
          const acknowledgedDate = acknowledged[order.id];
          
          // If acknowledged, don't show until delivery day
          if (acknowledgedDate) {
            const ackDate = parseISO(acknowledgedDate);
            // Only skip if acknowledged today or recently
            if (differenceInDays(today, ackDate) < 7) {
              return;
            }
          }

          highlights.push({ ...order, showReason: "7_days_before" } as OrderHighlight);
        }
      });

      return highlights;
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAcknowledgeOrderHighlight = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, action }: { orderId: string; action: "ciente" | "aguardando" }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const acknowledgedKey = `order_highlights_acknowledged_${user.id}`;
      const acknowledged: Record<string, string> = JSON.parse(
        localStorage.getItem(acknowledgedKey) || "{}"
      );

      if (action === "ciente") {
        // Mark as acknowledged - will reappear on delivery day
        acknowledged[orderId] = new Date().toISOString();
        localStorage.setItem(acknowledgedKey, JSON.stringify(acknowledged));
      }
      // "aguardando" does nothing - keeps showing

      return { orderId, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-highlights"] });
    },
  });
};
