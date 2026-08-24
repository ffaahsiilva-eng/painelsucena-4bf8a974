import { useEffect, useState, useCallback, useRef } from "react";
import { Cloud, CloudRain, Sun, CloudSun, CloudSnow, CloudLightning, Droplets, Wind, Thermometer, MapPin, RefreshCw, AlertCircle, CheckCircle2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

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

  // 7 fotos de construção (uma por dia da semana: dom, seg, ter, qua, qui, sex, sab)
  const constructionImages = [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80", // ponte/estrutura
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80", // canteiro de obras
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80", // ponte ao entardecer
    "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80", // guindaste
    "https://images.unsplash.com/photo-1590725140246-20acdee442be?auto=format&fit=crop&w=1200&q=80", // engenheiro/obra
    "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?auto=format&fit=crop&w=1200&q=80", // estrutura metálica
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80", // operário com capacete
  ];
  const todayImage = constructionImages[new Date().getDay()];

  const cardClass =
    "relative rounded-2xl p-5 h-full overflow-hidden shadow-lg transition-transform hover:scale-[1.01] bg-card border border-border glass-card-dashboard";
  const cardStyle: React.CSSProperties = {};
  const textMuted = "text-muted-foreground";


  if (error) {
    return (
      <div className={cardClass} style={cardStyle}>
        <Cloud className="h-8 w-8 mx-auto mb-2" />
        <p className={`text-sm text-center ${textMuted}`}>{error}</p>
        <Button variant="ghost" size="sm" className={`mt-2 w-full ${textMuted}`} onClick={() => fetchWeather()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className={cardClass} style={cardStyle}>
        <Skeleton className="h-10 w-20 bg-white/10" />
        <Skeleton className="h-5 w-32 mt-2 bg-white/10" />
      </div>
    );
  }

  const description = WMO_DESCRIPTIONS[weather.weatherCode] || "Indisponível";

  // Selecionar mídia configurada conforme período e condição.
  // Dia = 07:00 até 18:19 (Pará UTC-3). Noite = a partir de 18:20.
  const isCold = weather.temperature < 22;
  const nowPara = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const minutes = nowPara.getUTCHours() * 60 + nowPara.getUTCMinutes();
  const isDay = minutes >= 7 * 60 && minutes < 18 * 60 + 20; // 07:00 .. 18:19

  // Prioridade: chuva > frio (noite usa "fria") > demais (sol no dia, "quente" à noite)
  let pool: string[] = [];
  if (isDay) {
    if (isRainy) pool = settings.weather_day_rainy_media_urls || [];
    else if (isCold) pool = settings.weather_day_cold_media_urls || [];
    else pool = settings.weather_day_sunny_media_urls || [];
    // Fallback para mídia antiga single-URL
    if (pool.length === 0) {
      const legacy = isRainy ? settings.weather_rainy_media_url : isCold ? settings.weather_cold_media_url : settings.weather_sunny_media_url;
      if (legacy) pool = [legacy];
    }
  } else {
    if (isRainy) pool = settings.weather_night_rainy_media_urls || [];
    else if (isCold) pool = settings.weather_night_cold_media_urls || [];
    else pool = settings.weather_night_hot_media_urls || [];
  }

  // Sorteio determinístico por dia (mesmo vídeo durante todo o dia, muda no próximo)
  const daySeed = `${nowPara.getUTCFullYear()}-${nowPara.getUTCMonth()}-${nowPara.getUTCDate()}-${isDay ? "d" : "n"}`;
  let seedHash = 0;
  for (let i = 0; i < daySeed.length; i++) seedHash = (seedHash * 31 + daySeed.charCodeAt(i)) >>> 0;
  const mediaUrl = pool.length > 0 ? pool[seedHash % pool.length] : null;
  const isVideoMedia = !!mediaUrl && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(mediaUrl);

  return (
    <div className={cardClass} style={cardStyle}>
      {mediaUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
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

      <div className={`relative z-10 ${mediaUrl ? "text-white" : ""}`}>

        <div className={`flex items-center justify-between gap-1.5 text-[11px] mb-3 ${textMuted}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className={`h-3 w-3 shrink-0 ${isSunny ? "" : "text-primary"}`} />
            <span className="truncate">{weather.locationName}</span>
            <button
              type="button"
              onClick={() => requestGeolocation(false)}
              disabled={locating}
              title="Usar minha localização"
              className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Usar minha localização"
            >
              <LocateFixed className={`h-3 w-3 ${locating ? "animate-spin" : ""} ${coordsRef.current ? "text-emerald-400" : "text-primary"}`} />
            </button>
          </div>

          <div className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full ${isSunny ? 'bg-slate-900/5' : 'bg-white/10'}`}>
            {weather.isFallback ? (
              <>
                <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                <span className="font-medium">Fallback</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                <span className="font-medium">Tempo Real</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between mb-1">
          <span className="text-5xl font-extrabold leading-none tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>
            {weather.temperature}°
          </span>
        </div>

        <p className={`text-sm font-medium mb-4 ${textMuted}`}>{description}</p>

        <div className={`space-y-1.5 text-xs border-t pt-3 ${textMuted} ${isSunny ? "border-slate-900/10" : "border-primary/20"}`}>
          <div className="flex items-center gap-1.5">
            <Thermometer className={`h-3.5 w-3.5 ${isSunny ? "" : "text-primary"}`} />
            <span>Sensação {weather.apparentTemp}°</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className={`h-3.5 w-3.5 ${isSunny ? "" : "text-primary"}`} />
            <span>Umidade {weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className={`h-3.5 w-3.5 ${isSunny ? "" : "text-primary"}`} />
            <span>Vento {weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
