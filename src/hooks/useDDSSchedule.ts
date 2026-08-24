import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addDays } from "date-fns";
import { getBrazilNorthTodayString, getBrazilNorthTomorrowString, getBrazilNorthDate } from "@/lib/timezone";
import { resolveStorageUrl } from "@/lib/storage";

export interface DDSScheduleItem {
  id: string;
  month_year: string;
  scheduled_date: string;
  presenter_user_id: string | null;
  external_presenter_name: string | null;
  theme: string;
  photo_url: string | null;
  event_photo_url: string | null;
  environment: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  presenter?: {
    full_name: string;
    avatar_url: string | null;
    cargo: string;
    frame_color?: string | null;
    neon_color?: string | null;
    frame_animation?: string | null;
  };
}

export interface DDSScheduleInsert {
  month_year: string;
  scheduled_date: string;
  presenter_user_id?: string | null;
  external_presenter_name?: string | null;
  theme: string;
}

export const useDDSSchedule = (monthYear: string) => {
  return useQuery({
    queryKey: ["dds-schedule", monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dds_schedule")
        .select("*")
        .eq("month_year", monthYear)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      // Fetch presenter profiles for items with presenter_user_id
      if (data && data.length > 0) {
        const userIds = [...new Set(data.filter(d => d.presenter_user_id).map(d => d.presenter_user_id!))];
        const profileMap = new Map();
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
            .in("user_id", userIds);

          profiles?.forEach(p => profileMap.set(p.user_id, p));
        }

        const resolvedData = await Promise.all(data.map(async item => {
          const presenter = item.presenter_user_id ? { ...profileMap.get(item.presenter_user_id) } : undefined;
          if (presenter && presenter.avatar_url) {
            presenter.avatar_url = await resolveStorageUrl(presenter.avatar_url);
          }
          
          const [photoUrl, eventPhotoUrl] = await Promise.all([
            resolveStorageUrl(item.photo_url),
            resolveStorageUrl(item.event_photo_url)
          ]);

          return {
            ...item,
            photo_url: photoUrl,
            event_photo_url: eventPhotoUrl,
            presenter,
          };
        }));

        return resolvedData as DDSScheduleItem[];
      }

      return (data || []) as DDSScheduleItem[];
    },
  });
};

export const useDDSByDate = (dateStr: string) => {
  return useQuery({
    queryKey: ["dds-by-date", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dds_schedule")
        .select("*")
        .eq("scheduled_date", dateStr)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        let profile = undefined;
        if (data.presenter_user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
            .eq("user_id", data.presenter_user_id)
            .maybeSingle();
          profile = profileData || undefined;
        }

        if (profile && profile.avatar_url) {
          profile.avatar_url = await resolveStorageUrl(profile.avatar_url);
        }

        const [photoUrl, eventPhotoUrl] = await Promise.all([
          resolveStorageUrl(data.photo_url),
          resolveStorageUrl(data.event_photo_url)
        ]);

        return {
          ...data,
          photo_url: photoUrl,
          event_photo_url: eventPhotoUrl,
          presenter: profile,
        } as DDSScheduleItem;
      }

      return null;
    },
    enabled: !!dateStr,
  });
};

export const useTodayDDS = () => {
  return useQuery({
    queryKey: ["dds-today"],
    queryFn: async () => {
      // Calculate date at fetch time to always get current date
      const today = getBrazilNorthTodayString();
      
      const { data, error } = await supabase
        .from("dds_schedule")
        .select("*")
        .eq("scheduled_date", today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        let profile = undefined;
        if (data.presenter_user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
            .eq("user_id", data.presenter_user_id)
            .maybeSingle();
          profile = profileData || undefined;
        }

        if (profile && profile.avatar_url) {
          profile.avatar_url = await resolveStorageUrl(profile.avatar_url);
        }

        const [photoUrl, eventPhotoUrl] = await Promise.all([
          resolveStorageUrl(data.photo_url),
          resolveStorageUrl(data.event_photo_url)
        ]);

        return {
          ...data,
          photo_url: photoUrl,
          event_photo_url: eventPhotoUrl,
          presenter: profile,
        } as DDSScheduleItem;
      }

      return null;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};

export const useTomorrowDDS = () => {
  return useQuery({
    queryKey: ["dds-tomorrow"],
    queryFn: async () => {
      // Calculate date at fetch time to always get current date
      const tomorrow = getBrazilNorthTomorrowString();
      
      const { data, error } = await supabase
        .from("dds_schedule")
        .select("*")
        .eq("scheduled_date", tomorrow)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        let profile = undefined;
        if (data.presenter_user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
            .eq("user_id", data.presenter_user_id)
            .maybeSingle();
          profile = profileData || undefined;
        }

        if (profile && profile.avatar_url) {
          profile.avatar_url = await resolveStorageUrl(profile.avatar_url);
        }

        const [photoUrl, eventPhotoUrl] = await Promise.all([
          resolveStorageUrl(data.photo_url),
          resolveStorageUrl(data.event_photo_url)
        ]);

        return {
          ...data,
          photo_url: photoUrl,
          event_photo_url: eventPhotoUrl,
          presenter: profile,
        } as DDSScheduleItem;
      }

      return null;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};

export const useUpdateDDSPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, photo_url }: { id: string; photo_url: string | null }) => {
      const { data, error } = await supabase
        .from("dds_schedule")
        .update({ photo_url } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dds-schedule", data.month_year] });
      queryClient.invalidateQueries({ queryKey: ["dds-today"] });
      queryClient.invalidateQueries({ queryKey: ["dds-tomorrow"] });
    },
  });
};

export const useUpdateDDSEventPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, event_photo_url }: { id: string; event_photo_url: string | null }) => {
      const { data, error } = await supabase
        .from("dds_schedule")
        .update({ event_photo_url } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dds-schedule", data.month_year] });
      queryClient.invalidateQueries({ queryKey: ["dds-today"] });
      queryClient.invalidateQueries({ queryKey: ["dds-tomorrow"] });
    },
  });
};

export const useCreateDDSSchedule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (items: DDSScheduleInsert[]) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const insertData = items.map(item => ({
        ...item,
        created_by: user.id,
      }));

      const { data, error } = await supabase
        .from("dds_schedule")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["dds-schedule", variables[0].month_year] });
      }
    },
  });
};

export const useUpdateDDSSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      presenter_user_id, 
      external_presenter_name,
      theme 
    }: { 
      id: string; 
      presenter_user_id?: string | null; 
      external_presenter_name?: string | null;
      theme: string;
    }) => {
      const { data, error } = await supabase
        .from("dds_schedule")
        .update({ 
          presenter_user_id: presenter_user_id || null, 
          external_presenter_name: external_presenter_name || null,
          theme 
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dds-schedule", data.month_year] });
      queryClient.invalidateQueries({ queryKey: ["dds-today"] });
      queryClient.invalidateQueries({ queryKey: ["dds-tomorrow"] });
    },
  });
};

export const useDeleteDDSSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      const { error } = await supabase
        .from("dds_schedule")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, monthYear };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dds-schedule", data.monthYear] });
    },
  });
};

export const useClearMonthDDS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (monthYear: string) => {
      const { error } = await supabase
        .from("dds_schedule")
        .delete()
        .eq("month_year", monthYear);

      if (error) throw error;
      return monthYear;
    },
    onSuccess: (monthYear) => {
      queryClient.invalidateQueries({ queryKey: ["dds-schedule", monthYear] });
    },
  });
};

export const getWeekdaysInMonth = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const allDays = eachDayOfInterval({ start, end });
  return allDays.filter(day => !isWeekend(day));
};

export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
        .order("full_name", { ascending: true });

      if (error) throw error;
      
      const resolvedProfiles = await Promise.all((data || []).map(async p => {
        const profile = { ...p };
        if (profile.avatar_url) profile.avatar_url = await resolveStorageUrl(profile.avatar_url);
        return profile;
      }));

      return resolvedProfiles;
    },
  });
};
