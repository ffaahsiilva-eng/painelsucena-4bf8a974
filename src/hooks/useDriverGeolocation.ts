import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, permissionStatus: "unsupported", error: "Geolocalização não suportada" }));
      return;
    }

    // Check permission status if available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        setState((s) => ({ ...s, permissionStatus: result.state as any }));
        result.onchange = () => {
          setState((s) => ({ ...s, permissionStatus: result.state as any }));
        };
      } catch {
        // permissions API not available, will be determined by getCurrentPosition
      }
    }

    // Request position to trigger the permission prompt
    navigator.geolocation.getCurrentPosition(
      (pos) => {
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
      },
      (err) => {
        setState((s) => ({
          ...s,
          permissionStatus: err.code === 1 ? "denied" : s.permissionStatus,
          error: err.code === 1 ? "Permissão de localização negada" : err.message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [updateLocationInDb]);

  // Start watching position after permission is granted
  useEffect(() => {
    if (state.permissionStatus !== "granted" || !equipmentId) return;

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        latestCoordsRef.current = { lat: latitude, lng: longitude };
        setState((s) => ({ ...s, latitude, longitude, error: null }));
      },
      (err) => {
        console.error("Geolocation watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    // Periodically send to DB
    intervalRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        updateLocationInDb(latestCoordsRef.current.lat, latestCoordsRef.current.lng);
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
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
