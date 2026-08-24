import { useEffect, useRef } from "react";
import { useExpiringDocuments } from "./useDocuments";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { useAuth } from "./useAuth";
import { getDaysUntilEventBrazilNorth } from "@/lib/timezone";

const NOTIFICATION_KEY = "document_expiry_notifications_shown";

export const useDocumentExpiryNotifications = () => {
  const { user } = useAuth();
  const { data: expiringDocs } = useExpiringDocuments(5);
  const { isGranted, showNotification, requestPermission } = useBrowserNotifications();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !expiringDocs || expiringDocs.length === 0 || hasShownRef.current) {
      return;
    }

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

    // Find the most urgent document
    const urgentDocs = expiringDocs.filter(doc => {
      const days = getDaysUntilEventBrazilNorth(doc.expiry_date);
      return days <= 2;
    });

    const docsToNotify = urgentDocs.length > 0 ? urgentDocs : expiringDocs;

    if (docsToNotify.length > 0) {
      const count = docsToNotify.length;
      const mostUrgent = docsToNotify[0];
      const days = getDaysUntilEventBrazilNorth(mostUrgent.expiry_date);

      let message = "";
      if (count === 1) {
        if (days === 0) {
          message = `O documento "${mostUrgent.title}" vence hoje!`;
        } else if (days === 1) {
          message = `O documento "${mostUrgent.title}" vence amanhã!`;
        } else {
          message = `O documento "${mostUrgent.title}" vence em ${days} dias.`;
        }
      } else {
        message = `${count} documentos a vencer nos próximos 5 dias. O mais urgente é "${mostUrgent.title}".`;
      }

      showNotification("📄 Documentos a Vencer", {
        body: message,
        tag: "document-expiry",
        requireInteraction: true,
      });

      // Mark as shown for today
      localStorage.setItem(`${NOTIFICATION_KEY}_${user.id}`, today);
      hasShownRef.current = true;
    }
  }, [user?.id, expiringDocs, isGranted, showNotification, requestPermission]);
};
