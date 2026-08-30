import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Geolocation, Position } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: "prompt" | "granted" | "denied" | "unsupported";
  error: string | null;
}

const UPDATE_INTERVAL_MS = 60_000; // Update location every 60 seconds

export function useDriverGeolocation(equipmentId: string | null) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    permissionStatus: "prompt",
    error: null,
  });
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateLocationInDb = useCallback(
    async (lat: number, lng: number) => {
      if (!equipmentId) return;
      try {
        await supabase
          .from("equipment")
          .update({
            latitude: lat,
            longitude: lng,
            location_updated_at: new Date().toISOString(),
          } as any)
          .eq("id", equipmentId);
      } catch (err) {
        console.error("Error updating location:", err);
      }
    },
    [equipmentId]
  );

  const requestPermission = useCallback(async () => {
    try {
      // For web, check permissions first
      if (Capacitor.getPlatform() === 'web' && !navigator.geolocation) {
        setState((s) => ({ ...s, permissionStatus: "unsupported", error: "Geolocalização não suportada" }));
        return;
      }
      
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          setState((s) => ({
            ...s,
            permissionStatus: "denied",
            error: "Permissão de localização negada",
          }));
          return;
        }
      }

      setState((s) => ({ ...s, permissionStatus: "granted", error: null }));
      
      // Get initial position
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const { latitude, longitude } = pos.coords;
      latestCoordsRef.current = { lat: latitude, lng: longitude };
      setState((s) => ({
        ...s,
        latitude,
        longitude,
        permissionStatus: "granted",
        error: null,
      }));
      updateLocationInDb(latitude, longitude);

    } catch (err: any) {
      console.error("Erro ao solicitar permissão de localização:", err);
      setState((s) => ({
        ...s,
        permissionStatus: "denied",
        error: err.message || "Erro de localização",
      }));
    }
  }, [updateLocationInDb]);

  // Start watching position after permission is granted
  useEffect(() => {
    if (state.permissionStatus !== "granted" || !equipmentId) return;

    // Watch position changes
    const startWatching = async () => {
      try {
        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, maximumAge: 30000 },
          (pos, err) => {
            if (err) {
              console.error("Geolocation watch error:", err);
              return;
            }
            if (pos) {
              const { latitude, longitude } = pos.coords;
              latestCoordsRef.current = { lat: latitude, lng: longitude };
              setState((s) => ({ ...s, latitude, longitude, error: null }));
            }
          }
        );
        // Cast to any because Capacitor watchId is string on native but might be number on web
        watchIdRef.current = watchId as any; 
      } catch (err) {
        console.error("Erro ao iniciar rastreamento:", err);
      }
    };
    
    startWatching();

    // Periodically send to DB
    intervalRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        updateLocationInDb(latestCoordsRef.current.lat, latestCoordsRef.current.lng);
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        // Safe clear watch
        Geolocation.clearWatch({ id: watchIdRef.current as any }).catch(console.error);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.permissionStatus, equipmentId, updateLocationInDb]);

  // Clear location when unmounting (driver leaves)
  useEffect(() => {
    return () => {
      if (equipmentId) {
        supabase
          .from("equipment")
          .update({
            latitude: null,
            longitude: null,
            location_updated_at: null,
          } as any)
          .eq("id", equipmentId)
          .then(() => {});
      }
    };
  }, [equipmentId]);

  return { ...state, requestPermission };
}
