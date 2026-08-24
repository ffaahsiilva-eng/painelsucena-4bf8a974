import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentTemperature {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  fetchedAt: string;
}

/**
 * Busca a temperatura atual em Vila dos Cabanos (Barcarena - PA).
 * Atualiza a cada 5 minutos.
 */
export function useCurrentTemperature(enabled: boolean = true) {
  const [data, setData] = useState<CurrentTemperature | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTemp = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("weather-current");
      if (error) throw error;
      if (!response?.current) return;
      setData({
        temperature: Math.round(response.current.temperature_2m),
        apparentTemp: Math.round(response.current.apparent_temperature),
        humidity: Math.round(response.current.relative_humidity_2m),
        fetchedAt: response.fetchedAt || new Date().toISOString(),
      });
    } catch (err) {
      console.warn("useCurrentTemperature falhou:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchTemp();
    const interval = setInterval(fetchTemp, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, fetchTemp]);

  return { data, loading, refetch: fetchTemp };
}
