import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const DEFAULT_LAT = -1.5189;
const DEFAULT_LON = -48.6356;
const DEFAULT_LOCATION_NAME = "Barcarena - Vila dos Cabanos";

function buildWeatherUrls(lat: number, lon: number): string[] {
  const base = `latitude=${lat}&longitude=${lon}`;
  return [
    `https://api.open-meteo.com/v1/forecast?${base}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=America/Sao_Paulo`,
    `https://api.open-meteo.com/v1/forecast?${base}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`,
  ];
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SucenaPainel/1.0)" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
      if (response.status >= 500 && i < retries) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError ?? new Error("fetch failed");
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt&count=1`;
    const r = await fetchWithRetry(url, 1);
    if (!r.ok) return null;
    const j = await r.json();
    const res = j?.results?.[0];
    if (!res) return null;
    const city = res.name || res.admin3 || res.admin2;
    const region = res.admin1;
    if (city && region && city !== region) return `${region} - ${city}`;
    return city || region || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Read coords from body (POST) or query string (GET)
  let lat = DEFAULT_LAT;
  let lon = DEFAULT_LON;
  let providedCoords = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (body && typeof body.lat === "number" && typeof body.lon === "number") {
        lat = body.lat; lon = body.lon; providedCoords = true;
      }
    } else {
      const url = new URL(req.url);
      const qLat = parseFloat(url.searchParams.get("lat") ?? "");
      const qLon = parseFloat(url.searchParams.get("lon") ?? "");
      if (!Number.isNaN(qLat) && !Number.isNaN(qLon)) {
        lat = qLat; lon = qLon; providedCoords = true;
      }
    }
  } catch { /* ignore */ }

  const locationName = providedCoords
    ? (await reverseGeocode(lat, lon)) || `Local (${lat.toFixed(3)}, ${lon.toFixed(3)})`
    : DEFAULT_LOCATION_NAME;

  for (const url of buildWeatherUrls(lat, lon)) {
    try {
      const response = await fetchWithRetry(url, 2);
      if (!response.ok) continue;

      const data = await response.json();

      let current = data?.current;
      if (!current && data?.current_weather) {
        const cw = data.current_weather;
        const hourly = data.hourly ?? {};
        const idx = hourly.time?.indexOf?.(cw.time) ?? -1;
        current = {
          temperature_2m: cw.temperature,
          apparent_temperature: idx >= 0 ? hourly.apparent_temperature?.[idx] ?? cw.temperature : cw.temperature,
          relative_humidity_2m: idx >= 0 ? hourly.relative_humidity_2m?.[idx] ?? 0 : 0,
          wind_speed_10m: cw.windspeed,
          weather_code: cw.weathercode,
          is_day: cw.is_day,
        };
      }

      if (!current) continue;

      return new Response(
        JSON.stringify({
          current,
          fetchedAt: new Date().toISOString(),
          locationName,
          coords: { lat, lon },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      console.warn(`weather-current: endpoint failed ${url}:`, String(err));
    }
  }

  console.error("weather-current: all endpoints failed, returning fallback");
  return new Response(
    JSON.stringify({
      current: {
        temperature_2m: 28,
        apparent_temperature: 30,
        relative_humidity_2m: 75,
        wind_speed_10m: 8,
        weather_code: 2,
        is_day: 1,
      },
      fetchedAt: new Date().toISOString(),
      locationName,
      coords: { lat, lon },
      fallback: true,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
