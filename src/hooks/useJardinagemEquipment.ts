 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";

export interface CreateJardinagemEquipmentInput {
  name: string;
  image_url?: string | null;
}
 
 export interface JardinagemEquipment {
   id: string;
   name: string;
   status: "entrou" | "saiu";
   status_changed_at: string;
   status_changed_by: string | null;
   image_url?: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export const useJardinagemEquipment = () => {
   return useQuery({
     queryKey: ["jardinagem-equipment"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("jardinagem_equipment")
         .select("id, name, status, status_changed_at, status_changed_by, image_url, created_at, updated_at")
         .order("name");
 
       if (error) throw error;
       return data as JardinagemEquipment[];
     },
   });
 };

export const useCreateJardinagemEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, image_url }: CreateJardinagemEquipmentInput) => {
      const { error } = await supabase
        .from("jardinagem_equipment")
        .insert({
          name,
          status: "saiu",
          image_url: image_url ?? null,
        });

      if (error) throw error;
      return { name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-equipment"] });
      toast.success(`${data.name} adicionado com sucesso`);
    },
    onError: (error) => {
      console.error("Erro ao adicionar equipamento:", error);
      toast.error("Erro ao adicionar equipamento");
    },
  });
};

export const useUpdateJardinagemEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, image_url }: { id: string; name?: string; image_url?: string | null }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (image_url !== undefined) updates.image_url = image_url;
      const { error } = await supabase
        .from("jardinagem_equipment")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-equipment"] });
      toast.success("Equipamento atualizado");
    },
    onError: (error) => {
      console.error("Erro ao atualizar equipamento:", error);
      toast.error("Erro ao atualizar equipamento");
    },
  });
};

export const useDeleteJardinagemEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jardinagem_equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-equipment"] });
      toast.success("Equipamento removido com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao remover equipamento:", error);
      toast.error("Erro ao remover equipamento");
    },
  });
};
 
 export const useUpdateJardinagemEquipmentStatus = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
    mutationFn: async ({
      id,
      name,
      newStatus,
      customDateTime,
    }: {
      id: string;
      name: string;
      newStatus: "entrou" | "saiu";
      customDateTime?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const now = customDateTime ? new Date(customDateTime) : new Date();

       // Update the equipment status
       const { error: updateError } = await supabase
         .from("jardinagem_equipment")
         .update({
           status: newStatus,
           status_changed_at: now.toISOString(),
           status_changed_by: user.id,
         })
         .eq("id", id);
 
       if (updateError) throw updateError;
 
       // Get user profile for announcement
       const { data: profile } = await supabase
         .from("profiles")
         .select("full_name")
         .eq("user_id", user.id)
         .single();
 
       const userName = profile?.full_name || "Usuário";
       const formattedDateTime = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
       const statusEmoji = newStatus === "entrou" ? "🟢" : "🔴";
       const statusLabel = newStatus === "entrou" ? "ENTRADA" : "SAÍDA";
 
       // Create announcement for all users
       const { error: announcementError } = await supabase
         .from("announcements")
         .insert({
           title: `${statusEmoji} ${statusLabel} - ${name}`,
           content: `O equipamento **${name}** foi registrado como **${newStatus === "entrou" ? "ENTRADA" : "SAÍDA"}** em ${formattedDateTime}.\n\nRegistrado por: ${userName}`,
           created_by: user.id,
           target_type: "all",
           published_at: now.toISOString(),
         });
 
       if (announcementError) {
         console.error("Erro ao criar comunicado:", announcementError);
       }

       // Enfileira mensagem no WhatsApp (grupo de movimentações de equipamentos)
       try {
         const { data: cfg } = await supabase
           .from("wapi_config")
           .select("enabled, group_id, group_id_equipment_movements, auto_send_equipment_movements")
           .limit(1)
           .maybeSingle();

         const targetGroup =
           (cfg?.group_id_equipment_movements?.trim() || cfg?.group_id?.trim() || "");

         if (cfg?.enabled && cfg?.auto_send_equipment_movements !== false && targetGroup) {
           const headerEmoji = newStatus === "entrou" ? "⬅️🏠" : "🚪➡️";
           const headerLabel = newStatus === "entrou"
             ? "ENTRADA DE EQUIPAMENTO (JARDINAGEM)"
             : "SAÍDA DE EQUIPAMENTO (JARDINAGEM)";
           const dateBR = format(now, "dd/MM/yyyy");
           const timeBR = format(now, "HH:mm");

           const message =
             `${headerEmoji} *${headerLabel}*\n` +
             `━━━━━━━━━━━━━━━━━━━━\n\n` +
             `*Equipamento:* ${name}\n` +
             `*Data:* ${dateBR}\n` +
             `*Horário:* ${timeBR}\n` +
             `*Movimento:* ${newStatus === "entrou" ? "🟢 Entrada" : "🔴 Saída"}\n\n` +
             `*Registrado por:* ${userName}\n` +
             `━━━━━━━━━━━━━━━━━━━━`;

           const dedupeKey = `jardinagem-equipment|${id}|${newStatus}|${now.toISOString().slice(0, 16)}`;

           const { error: outboxError } = await supabase.from("wapi_outbox").insert({
             kind: "text",
             target_type: "group",
             phone: targetGroup,
             message,
             origin: "jardinagem-equipment",
             external_kind: "jardinagem-equipment",
             external_id: id,
             dedupe_key: dedupeKey,
           });

           if (outboxError) {
             console.error("Erro ao enfileirar WhatsApp jardinagem:", outboxError);
           }
         }
       } catch (wapiErr) {
         console.error("Falha no envio WhatsApp jardinagem:", wapiErr);
       }


 
       return { id, name, newStatus };
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["jardinagem-equipment"] });
       toast.success(
         `${data.name} marcado como ${data.newStatus === "entrou" ? "Entrou" : "Saiu"}`
       );
     },
     onError: (error) => {
       console.error("Erro ao atualizar status:", error);
       toast.error("Erro ao atualizar status do equipamento");
     },
   });
 };