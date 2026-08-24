// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "./useAuth";
import { useEnvironment } from "./useEnvironment";
import { useEffect } from "react";
import { getBrazilNorthMidnight, getDaysUntilEventBrazilNorth } from "@/lib/timezone";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null; // HH:mm format
  alert_days_before: number;
  show_on_event_day: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users: string[];
  acknowledged_by: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean | null;
  recurring_days: number[] | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  creator_name?: string; // Nome do criador (joined from profiles)
}

export interface ReminderInsert {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string | null;
  alert_days_before?: number;
  show_on_event_day?: boolean;
  mention_type: "all" | "specific" | "me";
  mentioned_users?: string[];
  created_by: string;
  is_recurring?: boolean;
  recurring_days?: number[];
}

export const useReminders = () => {
  const { user } = useAuth();
  const { environment } = useEnvironment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reminders", user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      
      // Fetch creator names
      const creatorIds = [...new Set((data || []).map(r => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(r => ({
        ...r,
        creator_name: profileMap.get(r.created_by) || "Desconhecido",
      })) as Reminder[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    return subscribeToTable(
      { event: "*", table: "reminders" },
      () => queryClient.invalidateQueries({ queryKey: ["reminders", user.id] })
    );
  }, [user?.id, queryClient]);

  return query;
};

export const useActiveReminders = () => {
  const { user } = useAuth();
  const { environment } = useEnvironment();

  return useQuery({
    queryKey: ["active-reminders", user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const todayStart = getBrazilNorthMidnight();
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayDateStr = todayStart.toISOString().split("T")[0];

      // Fetch acknowledgements made today (used for recurring reminders)
      const { data: todayAcknowledgements } = await supabase
        .from("reminder_history")
        .select("reminder_id")
        .eq("action", "acknowledged")
        .eq("action_by", user.id)
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString());

      const acknowledgedTodayReminderIds = new Set(
        (todayAcknowledgements || []).map((a) => a.reminder_id)
      );

      // Fetch active snoozes for this user (snoozed_until > today)
      const { data: snoozeData } = await supabase
        .from("reminder_snoozes" as any)
        .select("reminder_id, snoozed_until")
        .eq("user_id", user.id);

      const snoozedMap = new Map<string, string>();
      (snoozeData || []).forEach((s: any) => {
        snoozedMap.set(s.reminder_id, s.snoozed_until);
      });

      // Fetch reminders with creator profile
      const { data, error } = await supabase
        .from("reminders")
        .select(`
          *,
          profiles!reminders_created_by_fkey(full_name)
        `)
        .order("event_date", { ascending: true });

      if (error) {
        // Fallback if foreign key doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("reminders")
          .select("*")
          .order("event_date", { ascending: true });

        if (fallbackError) throw fallbackError;

        const creatorIds = [...new Set((fallbackData || []).map(r => r.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        const reminders = (fallbackData || []).map(r => ({
          ...r,
          creator_name: profileMap.get(r.created_by) || "Desconhecido",
        })) as Reminder[];

        return filterActiveReminders(reminders, user.id, acknowledgedTodayReminderIds, snoozedMap, todayDateStr);
      }

      const reminders = (data || []).map(r => ({
        ...r,
        creator_name: (r.profiles as any)?.full_name || "Desconhecido",
      })) as Reminder[];
      
      return filterActiveReminders(reminders, user.id, acknowledgedTodayReminderIds, snoozedMap, todayDateStr);
    },
    enabled: !!user?.id,
  });
};

// Helper function to filter active reminders
const filterActiveReminders = (
  reminders: Reminder[],
  userId: string,
  acknowledgedTodayReminderIds: Set<string>,
  snoozedMap: Map<string, string>,
  todayDateStr: string
): Reminder[] => {
  // Get current day of week in Brazil North timezone (0=Sunday, 6=Saturday)
  const nowBrazil = getBrazilNorthMidnight();
  const currentDayOfWeek = nowBrazil.getDay();
  
  return reminders.filter((reminder) => {
    // Check if snoozed until a future date
    const snoozedUntil = snoozedMap.get(reminder.id);
    if (snoozedUntil && snoozedUntil > todayDateStr) {
      return false; // Still snoozed
    }

    // For recurring reminders, hide only if acknowledged TODAY via history
    const isRecurring = !!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0;
    if (isRecurring) {
      if (acknowledgedTodayReminderIds.has(reminder.id)) return false;
    } else {
      const hasAcknowledged = reminder.acknowledged_by?.includes(userId);
      if (hasAcknowledged) return false;
    }

    // Check if user should see this reminder based on mention_type
    const isCreator = reminder.created_by === userId;
    const isRelevant =
      isCreator ||
      reminder.mention_type === "all" ||
      (reminder.mention_type === "me" && reminder.created_by === userId) ||
      (reminder.mention_type === "specific" &&
        reminder.mentioned_users.includes(userId));

    if (!isRelevant) return false;

    // Handle recurring reminders (by day of week)
    if (!!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0) {
      return (reminder.recurring_days || []).includes(currentDayOfWeek);
    }

    // Handle regular (non-recurring) reminders
    // Respect alert_days_before strictly: only show in highlights when within the alert window
    const daysUntilEvent = getDaysUntilEventBrazilNorth(reminder.event_date);

    if (reminder.alert_days_before > 0 && daysUntilEvent <= reminder.alert_days_before && daysUntilEvent >= 0) {
      return true;
    }

    if (reminder.show_on_event_day && daysUntilEvent === 0) {
      return true;
    }

    return false;
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Omit<ReminderInsert, "created_by">) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          ...reminder,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Reminder> & { id: string }) => {
      const { error } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Save to history before deleting
      await supabase.from("reminder_history").insert({
        reminder_id: reminder.id,
        reminder_title: reminder.title,
        reminder_description: reminder.description,
        event_date: reminder.event_date,
        action: "cancelled",
        action_by: user.id,
        original_created_by: reminder.created_by,
        mention_type: reminder.mention_type,
      });

      const { error } = await supabase.from("reminders").delete().eq("id", reminder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-history"] });
    },
  });
};

export const useAcknowledgeReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First get the current acknowledged_by array
      const { data: currentReminder, error: fetchError } = await supabase
        .from("reminders")
        .select("acknowledged_by")
        .eq("id", reminder.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Acknowledge fetch error:", fetchError);
        throw fetchError;
      }
      if (!currentReminder) throw new Error("Reminder not found");

      const currentAcknowledged = currentReminder.acknowledged_by || [];
      
      // For recurring reminders, persist daily acknowledgement in history only
      const isRecurring = !!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0;
      const ackKey = user.id;
      
      // Add user to acknowledged list if not already there (non-recurring)
      if (!currentAcknowledged.includes(ackKey) || isRecurring) {
        // Save to history
        const { error: historyError } = await supabase.from("reminder_history").insert({
          reminder_id: reminder.id,
          reminder_title: reminder.title,
          reminder_description: reminder.description,
          event_date: reminder.event_date,
          action: "acknowledged",
          action_by: user.id,
          original_created_by: reminder.created_by,
          mention_type: reminder.mention_type,
        });

        if (historyError) {
          console.error("Acknowledge history insert error:", historyError);
          // Don't throw - still allow the acknowledge to proceed
        }

        // Recurring reminders should not update acknowledged_by (uuid[]) with date-keys
        if (isRecurring) return;

        const { error } = await supabase
          .from("reminders")
          .update({ 
            acknowledged_by: [...currentAcknowledged, ackKey] 
          })
          .eq("id", reminder.id);

        if (error) {
          console.error("Acknowledge update error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-history"] });
    },
  });
};

export interface ReminderHistory {
  id: string;
  reminder_id: string;
  reminder_title: string;
  reminder_description: string | null;
  event_date: string;
  action: "acknowledged" | "cancelled";
  action_by: string;
  original_created_by: string;
  mention_type: string;
  created_at: string;
}

export const useReminderHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reminder-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminder_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as ReminderHistory[];
    },
    enabled: !!user?.id,
  });
};

export const useSnoozeReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { environment } = useEnvironment();

  return useMutation({
    mutationFn: async ({ reminderId, snoozedUntil }: { reminderId: string; snoozedUntil: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Busca o lembrete para saber quem é o criador e quem está mencionado
      const { data: reminder, error: rErr } = await supabase
        .from("reminders")
        .select("*")
        .eq("id", reminderId)
        .maybeSingle();
      if (rErr) throw rErr;
      if (!reminder) throw new Error("Lembrete não encontrado");

      const isCreator = reminder.created_by === user.id;

      // Determina o conjunto de usuários afetados pelo snooze.
      // Se quem está adiando NÃO for o criador → snooze apenas individual.
      // Se for o criador → snooze coletivo (criador + mencionados + acknowledged_by).
      let userIds: string[] = [user.id];
      let mentionedIds: string[] = [];

      if (isCreator) {
        const ackd: string[] = Array.isArray(reminder.acknowledged_by) ? reminder.acknowledged_by : [];
        if (reminder.mention_type === "all") {
          // Aplica para todos os usuários conhecidos (profiles)
          const { data: allProfs } = await supabase.from("profiles").select("user_id");
          mentionedIds = (allProfs || []).map((p: any) => p.user_id).filter((id: string) => id && id !== user.id);
        } else if (reminder.mention_type === "specific" && Array.isArray(reminder.mentioned_users)) {
          mentionedIds = reminder.mentioned_users.filter((id: string) => id && id !== user.id);
        }
        userIds = Array.from(new Set([user.id, ...mentionedIds, ...ackd]));
      }

      // Upsert dos snoozes (um por usuário)
      const rows = userIds.map((uid) => ({
        reminder_id: reminderId,
        user_id: uid,
        snoozed_until: snoozedUntil,
        environment: environment,
      }));
      const { error } = await supabase
        .from("reminder_snoozes" as any)
        .upsert(rows as any, { onConflict: "reminder_id,user_id" });
      if (error) throw error;

      // Limpa "envios já feitos hoje" para que, se o snooze for para hoje/amanhã,
      // o cron possa reenviar com a nova data sem conflito de deduplicação.
      try {
        await supabase
          .from("reminder_notifications_sent" as any)
          .delete()
          .eq("reminder_id", reminderId)
          .gte("scheduled_for_date", new Date().toISOString().slice(0, 10));
      } catch {}

      // Se foi o CRIADOR quem adiou, dispara notificação WhatsApp
      // informando o adiamento aos mencionados.
      if (isCreator) {
        try {
          await supabase.functions.invoke("wapi-reminder-snooze-notify", {
            body: {
              reminder_id: reminderId,
              snoozed_until: snoozedUntil,
              snoozed_by: user.id,
              recipient_user_ids: mentionedIds,
            },
          });
        } catch (e) {
          console.warn("[snooze] notify failed", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
};
