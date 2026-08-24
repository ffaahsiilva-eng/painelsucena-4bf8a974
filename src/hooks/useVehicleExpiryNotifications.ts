import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DATE_FIELDS } from "./useVehicleInspections";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { useAuth } from "./useAuth";
import { parseISO, isValid, addDays, differenceInDays } from "date-fns";

const NOTIFICATION_KEY = "vehicle_expiry_notifications_shown";

interface ExpiryInfo {
  placa: string;
  fieldLabel: string;
  date: Date;
  daysUntilExpiry: number;
}

export const useVehicleExpiryNotifications = () => {
  const { user } = useAuth();
  const { isGranted, showNotification, requestPermission } = useBrowserNotifications();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!user?.id || hasShownRef.current) {
      return;
    }

    const checkExpiries = async () => {
      // Check if we've already shown notifications today
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem(`${NOTIFICATION_KEY}_${user.id}`);
      
      if (lastShown === today) {
        hasShownRef.current = true;
        return;
      }

      // Request permission if not granted
      if (!isGranted) {
        requestPermission();
        return;
      }

      const { data: vehicles, error } = await supabase
        .from("vehicle_inspections")
        .select("id, placa, modelo_veiculo, vistoria, laudo_opacidade, laudo_mecanico, plano_manutencao, cronografo");

      if (error || !vehicles || vehicles.length === 0) return;

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const warningDate = addDays(now, 15);

      // Collect all expiring/expired items
      const expiredItems: ExpiryInfo[] = [];
      const expiringItems: ExpiryInfo[] = [];

      vehicles.forEach((vehicle: any) => {
        DATE_FIELDS.forEach((field) => {
          const dateStr = vehicle[field.key];
          if (!dateStr) return;

          try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return;

            const daysUntilExpiry = differenceInDays(date, now);
            const info: ExpiryInfo = {
              placa: vehicle.placa,
              fieldLabel: field.label,
              date,
              daysUntilExpiry,
            };

            if (daysUntilExpiry < 0) {
              expiredItems.push(info);
            } else if (daysUntilExpiry <= 15) {
              expiringItems.push(info);
            }
          } catch (e) {
            console.error("Error parsing date:", dateStr, e);
          }
        });
      });

      let message = "";
      if (expiredItems.length > 0) {
        if (expiredItems.length === 1) {
          message = `Documento VENCIDO: ${expiredItems[0].fieldLabel} do veículo ${expiredItems[0].placa}.`;
        } else {
          message = `${expiredItems.length} documentos vencidos! Verifique o painel de frotas.`;
        }
      } else if (expiringItems.length > 0) {
        const sorted = [...expiringItems].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        const mostUrgent = sorted[0];
        
        if (expiringItems.length === 1) {
          if (mostUrgent.daysUntilExpiry === 0) {
            message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence hoje!`;
          } else if (mostUrgent.daysUntilExpiry === 1) {
            message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence amanhã!`;
          } else {
            message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence em ${mostUrgent.daysUntilExpiry} dias.`;
          }
        } else {
          message = `${expiringItems.length} documentos vencendo. O mais urgente: ${mostUrgent.fieldLabel} - ${mostUrgent.placa}.`;
        }
      }

      if (message) {
        showNotification("🚗 Alerta de Vistoria", {
          body: message,
          tag: "vehicle-expiry",
          requireInteraction: true,
        });

        // Mark as shown for today
        localStorage.setItem(`${NOTIFICATION_KEY}_${user.id}`, today);
        hasShownRef.current = true;
      }
    };

    checkExpiries();
  }, [user?.id, isGranted, showNotification, requestPermission]);
};