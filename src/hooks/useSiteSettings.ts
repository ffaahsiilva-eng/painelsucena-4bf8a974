import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "./useEnvironment";
import { resolveStorageUrl } from "@/lib/storage";
import sucenaLogo from "@/assets/Sucena-Official.png.asset.json";
import { compressImage } from "@/utils/imageCompression";


export interface SiteSettings {
  id: string;
  logo_url: string | null;
  sidebar_color: string;
  transition_logo_url: string | null;
  nav_order: string[];
  show_signup_button: boolean;
  ui_theme: string;
  primary_color: string | null;
  instacena_gif_position: { x: number; y: number } | null;
  instacena_gif_size: number;
  instacena_gif_height: number | null;
  instacena_gif_url: string | null;
  instacena_gif_right_url: string | null;
  instacena_gif_right_position: { x: number; y: number } | null;
  instacena_gif_right_size: number;
  instacena_gif_right_height: number | null;
  instacena_gif_opacity: number;
  instacena_gif_right_opacity: number;
  screensaver_enabled: boolean;
  screensaver_timeout: number;
  login_background_url: string | null;
  login_particles_enabled: boolean;
  login_particles_color: string;
  login_particles_color2: string | null;
  login_particles_color3: string | null;
  login_particles_count: number;
  login_particles_speed: number;
  sidebar_animation: string | null;
  page_loading_img_url: string | null;
  login_transition_media_url: string | null;
  login_anim_logo_duration_ms: number;
  login_anim_name_duration_ms: number;
  login_anim_intensity: number;
  global_background_url: string | null;
  global_background_opacity: number;
  card_opacity: number;
  weather_sunny_media_url: string | null;
  weather_rainy_media_url: string | null;
  weather_cold_media_url: string | null;
  weather_day_sunny_media_urls: string[];
  weather_day_rainy_media_urls: string[];
  weather_day_cold_media_urls: string[];
  weather_night_hot_media_urls: string[];
  weather_night_cold_media_urls: string[];
  weather_night_rainy_media_urls: string[];
  rh_matricula_hydro_label: string | null;
  forbidden_color_title: string;
  forbidden_colors_by_month: string[];
  environment_selection_background_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updated_at" | "updated_by"> & { id: string; updated_at: string; updated_by: null } = {
  id: "",
  logo_url: sucenaLogo.url,
  transition_logo_url: null,
  sidebar_color: "#1e2235",
  nav_order: [
    "atividades", "atividades-ii", "destaques", "campanhas", "dds", "documentos", "entrada-saida",
    "estoque", "lembretes", "parte-diaria", "presenca", "matriz", "pedidos", "rdo", "relatorio",
    "rh", "vistorias", "homologados", "vistoria-cintas", "arquivos-seguranca",
    "consumo-abastecimento", "slides", "instacena", "inspecao-canteiro",
    "calendario-hydro", "games", "desvios", "emergencia"
  ],
  show_signup_button: false,
  ui_theme: "classic",
  primary_color: null,
  instacena_gif_position: { x: 16, y: 80 },
  instacena_gif_size: 200,
  instacena_gif_height: null,
  instacena_gif_url: null,
  instacena_gif_right_url: null,
  instacena_gif_right_position: { x: 1000, y: 80 },
  instacena_gif_right_size: 200,
  instacena_gif_right_height: null,
  instacena_gif_opacity: 1,
  instacena_gif_right_opacity: 1,
  screensaver_enabled: true,
  screensaver_timeout: 5,
  login_background_url: null,
  login_particles_enabled: true,
  login_particles_color: "white",
  login_particles_color2: null,
  login_particles_color3: null,
  login_particles_count: 100,
  login_particles_speed: 1.0,
  sidebar_animation: "particles",
  page_loading_img_url: null,
  login_transition_media_url: null,
  login_anim_logo_duration_ms: 1400,
  login_anim_name_duration_ms: 1100,
  login_anim_intensity: 100,
  global_background_url: null,
  global_background_opacity: 0.1,
  card_opacity: 0.45,
  weather_sunny_media_url: null,
  weather_rainy_media_url: null,
  weather_cold_media_url: null,
  weather_day_sunny_media_urls: [],
  weather_day_rainy_media_urls: [],
  weather_day_cold_media_urls: [],
  weather_night_hot_media_urls: [],
  weather_night_cold_media_urls: [],
  weather_night_rainy_media_urls: [],
  rh_matricula_hydro_label: "Matrícula Hydro",
  forbidden_color_title: "Cores Proibidas por Mês",
  forbidden_colors_by_month: ["red","blue","yellow","green","red","blue","yellow","green","red","blue","yellow","green"],
  environment_selection_background_url: null,
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export function useSiteSettings() {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  // Se não houver ambiente selecionado, tentamos buscar uma configuração global ou de Barcarena por padrão
  const currentEnv = environment || "barcarena";

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["site-settings", currentEnv],
    queryFn: async (): Promise<SiteSettings> => {
      const envToFetch = currentEnv;

      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("environment", envToFetch)
        .maybeSingle();

      if (error) {
        console.error("Error fetching site settings:", error);
        throw error;
      }

      if (!data) {
        return { ...DEFAULT_SETTINGS, environment: envToFetch } as any;
      }

      const navOrder = Array.isArray(data.nav_order) 
        ? (data.nav_order as unknown as string[]) 
        : DEFAULT_SETTINGS.nav_order;

      const d = data as any;
      const resolvePath = resolveStorageUrl;

      const [
        loginBg,
        envSelectionBg,
        transitionLogo,
        pageLoadingImg,
        transitionMedia,
        globalBg,
        logoUrl,
        instaGifLeft,
        instaGifRight,
        weatherSunny,
        weatherRainy,
        weatherCold
      ] = await Promise.all([
        resolvePath(d.login_background_url),
        resolvePath(d.environment_selection_background_url),
        resolvePath(d.transition_logo_url),
        resolvePath(d.page_loading_img_url),
        resolvePath(d.login_transition_media_url),
        resolvePath(d.global_background_url),
        resolvePath(d.logo_url),
        resolvePath(d.instacena_gif_url),
        resolvePath(d.instacena_gif_right_url),
        resolvePath(d.weather_sunny_media_url),
        resolvePath(d.weather_rainy_media_url),
        resolvePath(d.weather_cold_media_url),
      ]);

      const resolvePaths = async (paths: string[] | null) => {
        if (!paths || !Array.isArray(paths)) return [];
        return Promise.all(paths.map(p => resolvePath(p)));
      };

      const [
        weatherDaySunny,
        weatherDayRainy,
        weatherDayCold,
        weatherNightHot,
        weatherNightCold,
        weatherNightRainy
      ] = await Promise.all([
        resolvePaths(d.weather_day_sunny_media_urls),
        resolvePaths(d.weather_day_rainy_media_urls),
        resolvePaths(d.weather_day_cold_media_urls),
        resolvePaths(d.weather_night_hot_media_urls),
        resolvePaths(d.weather_night_cold_media_urls),
        resolvePaths(d.weather_night_rainy_media_urls)
      ]);

      return {
        ...data,
        nav_order: navOrder,
        ui_theme: d.ui_theme || "classic",
        primary_color: d.primary_color || null,
        instacena_gif_position: d.instacena_gif_position || { x: 16, y: 80 },
        instacena_gif_size: d.instacena_gif_size || 200,
        instacena_gif_height: d.instacena_gif_height || null,
        instacena_gif_url: instaGifLeft,
        instacena_gif_right_url: instaGifRight,
        instacena_gif_right_position: d.instacena_gif_right_position || { x: 1000, y: 80 },
        instacena_gif_right_size: d.instacena_gif_right_size || 200,
        instacena_gif_right_height: d.instacena_gif_right_height || null,
        instacena_gif_opacity: d.instacena_gif_opacity ?? 1,
        instacena_gif_right_opacity: d.instacena_gif_right_opacity ?? 1,
        screensaver_enabled: d.screensaver_enabled ?? true,
        screensaver_timeout: d.screensaver_timeout ?? 5,
        login_background_url: loginBg,
        environment_selection_background_url: envSelectionBg,
        login_particles_enabled: d.login_particles_enabled ?? true,
        login_particles_color: d.login_particles_color || "white",
        login_particles_color2: d.login_particles_color2 || null,
        login_particles_color3: d.login_particles_color3 || null,
        login_particles_count: d.login_particles_count ?? 100,
        login_particles_speed: d.login_particles_speed ?? 1.0,
        sidebar_animation: d.sidebar_animation || "particles",
        transition_logo_url: transitionLogo,
        page_loading_img_url: pageLoadingImg,
        login_transition_media_url: transitionMedia,
        logo_url: logoUrl || sucenaLogo.url,
        login_anim_logo_duration_ms: d.login_anim_logo_duration_ms ?? 1400,
        login_anim_name_duration_ms: d.login_anim_name_duration_ms ?? 1100,
        login_anim_intensity: d.login_anim_intensity ?? 100,
        global_background_url: globalBg,
        global_background_opacity: d.global_background_opacity ?? 0.1,
        card_opacity: d.card_opacity ?? 0.45,
        weather_sunny_media_url: weatherSunny,
        weather_rainy_media_url: weatherRainy,
        weather_cold_media_url: weatherCold,
        weather_day_sunny_media_urls: weatherDaySunny.filter(p => !!p) as string[],
        weather_day_rainy_media_urls: weatherDayRainy.filter(p => !!p) as string[],
        weather_day_cold_media_urls: weatherDayCold.filter(p => !!p) as string[],
        weather_night_hot_media_urls: weatherNightHot.filter(p => !!p) as string[],
        weather_night_cold_media_urls: weatherNightCold.filter(p => !!p) as string[],
        weather_night_rainy_media_urls: weatherNightRainy.filter(p => !!p) as string[],
        rh_matricula_hydro_label: d.rh_matricula_hydro_label ?? "Matrícula Hydro",
        forbidden_color_title: d.forbidden_color_title ?? "Cores Proibidas por Mês",
        forbidden_colors_by_month: Array.isArray(d.forbidden_colors_by_month) && d.forbidden_colors_by_month.length === 12
          ? d.forbidden_colors_by_month
          : DEFAULT_SETTINGS.forbidden_colors_by_month,
      };
    },
    staleTime: 1000 * 60 * 15, // Increased to 15 minutes for site settings
    retry: 2,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<SiteSettings, "id" | "updated_at" | "updated_by">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();

      if (settings?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({
            ...updates,
            updated_at: nowIso,
            updated_by: user?.id,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Criar novas configurações para este ambiente se não existirem
        const { error } = await supabase
          .from("site_settings")
          .insert({
            ...DEFAULT_SETTINGS,
            ...updates,
            environment: currentEnv,
            updated_at: nowIso,
            updated_by: user?.id,
          });

        if (error) throw error;
      }

      // Propaga alterações visuais do Barcarena para todos os demais ambientes
      if (currentEnv === "barcarena") {
        const VISUAL_FIELDS = [
          "logo_url","transition_logo_url","sidebar_color","ui_theme","primary_color",
          "instacena_gif_position","instacena_gif_size","instacena_gif_height","instacena_gif_url",
          "instacena_gif_right_url","instacena_gif_right_position","instacena_gif_right_size",
          "instacena_gif_right_height","instacena_gif_opacity","instacena_gif_right_opacity",
          "screensaver_enabled","screensaver_timeout",
          "login_background_url","login_particles_enabled","login_particles_color",
          "login_particles_color2","login_particles_color3","login_particles_count","login_particles_speed",
          "sidebar_animation","page_loading_img_url","login_transition_media_url",
          "login_anim_logo_duration_ms","login_anim_name_duration_ms","login_anim_intensity",
          "global_background_url","global_background_opacity","card_opacity",
          "weather_sunny_media_url","weather_rainy_media_url","weather_cold_media_url",
          "weather_day_sunny_media_urls","weather_day_rainy_media_urls","weather_day_cold_media_urls",
          "weather_night_hot_media_urls","weather_night_cold_media_urls","weather_night_rainy_media_urls",
          "environment_selection_background_url",
        ];
        const visualUpdates: Record<string, any> = {};
        for (const k of VISUAL_FIELDS) {
          if (k in (updates as any)) visualUpdates[k] = (updates as any)[k];
        }
        if (Object.keys(visualUpdates).length > 0) {
          const { data: envs } = await supabase.from("environments").select("id");
          const others = (envs ?? []).map((e: any) => e.id).filter((id: string) => id && id !== "barcarena");
          for (const envId of others) {
            const { data: existing } = await supabase
              .from("site_settings")
              .select("id")
              .eq("environment", envId)
              .maybeSingle();
            if (existing?.id) {
              await supabase
                .from("site_settings")
                .update({ ...visualUpdates, updated_at: nowIso, updated_by: user?.id })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("site_settings")
                .insert({
                  ...DEFAULT_SETTINGS,
                  ...visualUpdates,
                  environment: envId,
                  updated_at: nowIso,
                  updated_by: user?.id,
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["global-nav-order"] });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(filePath, await compressImage(file), { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = await supabase.storage
      .from("site-assets")
      .createSignedUrl(filePath, 315360000); // URL válida por 10 anos

    return data?.signedUrl || "";
  };

  return {
    settings: settings ?? { ...DEFAULT_SETTINGS },
    isLoading,
    error,
    updateSettings,
    uploadLogo,
  };
}
