import { useEffect, useState, useCallback } from "react";

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          requireInteraction: false,
          ...options,
        });

        // Focus window when notification is clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto close after 8 seconds
        setTimeout(() => notification.close(), 8000);

        return notification;
      } catch (error) {
        console.error("Error showing notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
};
