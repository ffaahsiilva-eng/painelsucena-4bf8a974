import { useEffect, useState, useCallback, useRef } from "react";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw, AlertCircle, CheckCircle2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";

interface WeatherData {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  locationName: string;
  lastUpdated: string;
  isFallback: boolean;
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Céu limpo", 1: "Parcialmente limpo", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Neblina", 48: "Neblina com geada",
  51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa forte",
  61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
  71: "Neve leve", 73: "Neve moderada", 75: "Neve forte",
  80: "Pancadas leves", 81: "Pancadas moderadas", 82: "Pancadas fortes",
  95: "Tempestade", 96: "Tempestade c/ granizo", 99: "Tempestade severa",
};

const getWeatherIcon = (code: number) => {
  const cls = "h-10 w-10";
  if (code === 0 || code === 1) return <Sun className={`${cls} text-yellow-300`} />;
  if (code === 2) return <CloudSun className={`${cls} text-amber-300`} />;
  if (code === 3 || code === 45 || code === 48) return <Cloud className={`${cls} text-slate-300`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-sky-300`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${cls} text-sky-400`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-yellow-400`} />;
  return <Cloud className={`${cls} text-slate-300`} />;
};

const GEO_COORDS_KEY = "weather_user_coords";
const GEO_DENIED_KEY = "weather_geo_denied";

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [locating, setLocating] = useState(false);
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const { settings } = useSiteSettings();

  // Load cached coords
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GEO_COORDS_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (typeof c?.lat === "number" && typeof c?.lon === "number") coordsRef.current = c;
      }
    } catch { /* ignore */ }
  }, []);

  const fetchWeather = useCallback(async (coords?: { lat: number; lon: number } | null) => {
    setLoading(true);
    setError(null);
    try {
      const body = coords ?? coordsRef.current ?? undefined;
      const { data, error: functionError } = await supabase.functions.invoke("weather-current", {
        body: body ?? {},
      });
      if (functionError) throw functionError;
      if (!data?.current) throw new Error(data?.error || "No data");

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemp: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        locationName: data.locationName || "Barcarena - Vila dos Cabanos",
        lastUpdated: new Date(data.fetchedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isFallback: !!data.fallback,
      });
    } catch (err) {
      console.error("Erro ao obter previsão:", err);
      setError("Erro ao obter previsão");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGeolocation = useCallback((silent = false) => {
    if (!("geolocation" in navigator)) {
      if (!silent) toast.error("Este navegador não suporta geolocalização");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        coordsRef.current = coords;
        try { localStorage.setItem(GEO_COORDS_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
        try { localStorage.removeItem(GEO_DENIED_KEY); } catch { /* ignore */ }
        setNeedsPermission(false);
        setLocating(false);
        if (!silent) toast.success("Usando sua localização atual");
        fetchWeather(coords);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          try { localStorage.setItem(GEO_DENIED_KEY, "1"); } catch { /* ignore */ }
          setNeedsPermission(true);
          if (!silent) toast.error("Permissão de localização negada");
        } else if (!silent) {
          toast.error("Não foi possível obter sua localização");
        }
        // Ensure some data is shown
        if (!weather) fetchWeather(null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, [fetchWeather, weather]);

  // On mount: request permission (or use cached coords)
  useEffect(() => {
    const denied = (() => { try { return localStorage.getItem(GEO_DENIED_KEY) === "1"; } catch { return false; } })();
    if (coordsRef.current) {
      // Have cached coords → fetch immediately, then silently refresh coords
      fetchWeather(coordsRef.current);
      if (!denied) requestGeolocation(true);
    } else if (denied) {
      setNeedsPermission(true);
      fetchWeather(null);
    } else {
      // Ask permission on first load
      requestGeolocation(false);
      // Show default data while permission dialog is up
      fetchWeather(null);
    }
    const interval = setInterval(() => fetchWeather(coordsRef.current), 2 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const code = weather?.weatherCode ?? 3;
  const isRainy =
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95;
  const isSunny = code === 0 || code === 1 || code === 2;
  const isNight = weather ? !weather.isDay : false;
  const description = WMO_DESCRIPTIONS[code] || "—";

  const pickFirst = (...lists: Array<string[] | null | undefined>) => {
    for (const list of lists) {
      if (Array.isArray(list) && list.length > 0 && list[0]) return list[0];
    }
    return null;
  };

  const mediaUrl = isNight
    ? pickFirst(
        isRainy ? settings?.weather_night_rainy_media_urls : null,
        settings?.weather_night_hot_media_urls,
        settings?.weather_night_cold_media_urls,
      )
    : pickFirst(
        isRainy ? settings?.weather_day_rainy_media_urls : null,
        isSunny ? settings?.weather_day_sunny_media_urls : null,
        settings?.weather_day_cold_media_urls,
      ) ||
      (isRainy
        ? settings?.weather_rainy_media_url
        : isSunny
          ? settings?.weather_sunny_media_url
          : settings?.weather_cold_media_url) ||
      null;

  const isVideoMedia = Boolean(mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl));

  if (loading && !weather) {
    return <Skeleton className="h-full min-h-[240px] w-full rounded-2xl" />;
  }

  if (!weather) {
    return (
      <div className="h-full">
        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[240px] p-6 gap-3 text-[#292C2E]">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <p className="text-sm text-center">{error || "Clima indisponível"}</p>
          <Button size="sm" variant="outline" onClick={() => fetchWeather(coordsRef.current)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
          </Button>
          {needsPermission && (
            <Button size="sm" variant="ghost" onClick={() => requestGeolocation(false)}>
              <LocateFixed className="h-3.5 w-3.5 mr-1.5" /> Usar minha localização
            </Button>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="h-full">
      <GlassCard className="flex flex-col h-full p-6 relative overflow-hidden text-[#292C2E]">
        {mediaUrl && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl opacity-40 mix-blend-overlay">
            {isVideoMedia ? (
              <video
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img loading="lazy" decoding="async" src={mediaUrl} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        <div className={`relative z-10 h-full flex flex-col justify-between`}>
          <div className={`flex items-center justify-between gap-1.5 text-[11px] mb-3 text-[#6D7175]`}>
            <div className="flex items-center gap-1.5 min-w-0 font-semibold tracking-wide uppercase">
              <MapPin className={`h-3 w-3 shrink-0 text-[#B38A45]`} />
              <span className="truncate">{weather.locationName}</span>
              <button
                type="button"
                onClick={() => requestGeolocation(false)}
                disabled={locating}
                title="Usar minha localização"
                className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-black/5 transition-colors"
                aria-label="Usar minha localização"
              >
                <LocateFixed className={`h-3 w-3 ${locating ? "animate-spin" : ""} ${coordsRef.current ? "text-emerald-500" : "text-[#B38A45]"}`} />
              </button>
            </div>

            <div className={`flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-black/5 border border-black/5`}>
              {weather.isFallback ? (
                <>
                  <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                  <span className="font-semibold text-amber-700">Fallback</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  <span className="font-semibold text-emerald-700">Tempo Real</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between my-2">
            <div>
              <span className="text-[52px] font-extrabold leading-none tracking-tight text-[#292C2E]">
                {weather.temperature}°
              </span>
              <p className={`text-sm font-semibold mt-1 text-[#6D7175]`}>{description}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-[#B38A45] shadow-sm">
              {getWeatherIcon(weather.weatherCode)}
            </div>
          </div>

          <div className={`space-y-2 text-xs border-t border-black/10 pt-4 mt-auto font-medium text-[#6D7175]`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Thermometer className={`h-4 w-4 text-[#B38A45]`} />
                <span>Sensação</span>
              </div>
              <span className="font-bold text-[#292C2E]">{weather.apparentTemp}°</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className={`h-4 w-4 text-[#B38A45]`} />
                <span>Umidade</span>
              </div>
              <span className="font-bold text-[#292C2E]">{weather.humidity}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wind className={`h-4 w-4 text-[#B38A45]`} />
                <span>Vento</span>
              </div>
              <span className="font-bold text-[#292C2E]">{weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
