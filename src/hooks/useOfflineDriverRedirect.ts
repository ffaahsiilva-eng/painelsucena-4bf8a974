import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

// Driver roles that should be redirected when offline
const DRIVER_ROLES = ['motorista_pipa', 'motorista_munk'];

// Mobile breakpoint (matches Tailwind's md breakpoint)
const MOBILE_MAX_WIDTH = 768;

// Pages that drivers are allowed to access (no redirect needed if already there)
const DRIVER_ALLOWED_PATHS = [
  '/selecao-veiculo', 
  '/painel-motorista', 
  '/registro-movimento-motorista', 
  '/hora-extra', 
  '/equipamentos-motorista', 
  '/relatorios-motorista', 
  '/pontos-abastecimento', 
  '/lembretes'
];

/**
 * Hook that automatically redirects driver users to the driver panel
 * when they go offline on mobile devices.
 * 
 * This ensures drivers can continue working with offline-capable features
 * even without internet connection.
 */
export function useOfflineDriverRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useProfile();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_MAX_WIDTH);

  // Check if user is a driver
  const isDriver = profile?.cargo && DRIVER_ROLES.includes(profile.cargo);

  // Check if currently on an allowed driver path
  const isOnAllowedPath = DRIVER_ALLOWED_PATHS.includes(location.pathname);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor screen size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_MAX_WIDTH);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Redirect driver to panel when offline on mobile
  useEffect(() => {
    if (!isOnline && isMobile && isDriver && !isOnAllowedPath) {
      
      // Check if vehicle is selected
      const hasSelectedVehicle = localStorage.getItem("selectedVehicleId");
      
      if (hasSelectedVehicle) {
        navigate("/painel-motorista", { replace: true });
      } else {
        // If no vehicle selected, they need to select one first
        // But since they're offline, show the panel anyway as it has cached data
        navigate("/painel-motorista", { replace: true });
      }
    }
  }, [isOnline, isMobile, isDriver, isOnAllowedPath, navigate]);

  return {
    isOnline,
    isMobile,
    isDriver,
    shouldRedirect: !isOnline && isMobile && isDriver && !isOnAllowedPath,
  };
}
