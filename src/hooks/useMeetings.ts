import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { getBrazilNorthTodayString } from "@/lib/timezone";

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  room_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  participants: string[];
  status: string;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewMeetingInput {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  participants?: string[];
}

const QUERY_KEY = ["meetings"];

function generateRoomName(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30) || "reuniao";
  const rand = Math.random().toString(36).slice(2, 8);
  return `opshub-${slug}-${rand}`;
}

export function useMeetings() {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();

  const query = useQuery({
    queryKey: [...QUERY_KEY, environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          creator:profiles!meetings_created_by_fkey(avatar_url)
        `)
        .order("scheduled_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        created_by_avatar: m.creator?.avatar_url,
      })) as Meeting[];
    },
  });

  const today = getBrazilNorthTodayString();
  const meetings = query.data ?? [];
  const upcoming = meetings
    .filter((m) => m.status !== "finalizada" && m.scheduled_date >= today)
    .sort((a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date) ||
      a.start_time.localeCompare(b.start_time)
    );
  const past = meetings.filter(
    (m) => m.status === "finalizada" || m.scheduled_date < today
  );

  const create = useMutation({
    mutationFn: async (input: NewMeetingInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const created_by_name =
        profile?.full_name || user.email?.split("@")[0] || "Usuário";

      const room_name = generateRoomName(input.title);
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          title: input.title,
          description: input.description ?? null,
          scheduled_date: input.scheduled_date,
          start_time: input.start_time,
          end_time: input.end_time ?? null,
          participants: input.participants ?? [],
          room_name,
          created_by: user.id,
          created_by_name,
          status: "agendada",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Meeting> & { id: string }) => {
      const { data, error } = await supabase
        .from("meetings")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const finish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("meetings")
        .update({ status: "finalizada", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    meetings,
    upcoming,
    past,
    isLoading: query.isLoading,
    create,
    update,
    remove,
    finish,
  };
}
