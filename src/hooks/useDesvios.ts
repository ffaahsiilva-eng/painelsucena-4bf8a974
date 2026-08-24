import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface DesvioItem {
  id: string;
  description: string;
  photo_url: string | null;
  correction_photo_url: string | null;
  correction_observation: string | null;
}

export interface DesvioAttachment {
  name: string;
  url: string;
  type: string;
}

export interface DesvioHistoryEvent {
  date: string;
  user: string;
  action: string;
  comment: string;
}

export interface Desvio {
  id: string;
  description: string;
  photo_urls: string[];
  correction_photo_urls: string[];
  items: DesvioItem[];
  mentioned_user_id: string | null;
  mentioned_user_name: string | null;
  mentioned_user_ids: string[];
  mentioned_user_names: string[];
  due_date: string | null;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  instruction: string | null;
  correction: string | null;
  tags: string[];
  priority: string | null;
  responsible_name: string | null;
  responsible_company: string | null;
  responsible_sector: string | null;
  comments: string | null;
  history: DesvioHistoryEvent[];
  attachments: DesvioAttachment[];
}

export function useDesvios() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["desvios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desvios")
        .select("id, description, status, due_date, created_by, created_by_name, created_at, mentioned_user_name, priority, responsible_name, responsible_company")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        items: Array.isArray(d.items) ? d.items : [],
      })) as Desvio[];
    },
    enabled: !!user,
  });

  return query;
}

export function useCreateDesvio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (params: Partial<Desvio> & { notify?: boolean }) => {
      if (!user) throw new Error("Não autenticado");

      const { notify = true, ...desvioData } = params as any;

      const userName = profile?.full_name || "Usuário";
      const initialHistory: DesvioHistoryEvent[] = [{
        date: new Date().toISOString(),
        user: userName,
        action: "Criação",
        comment: notify ? "Desvio registrado e enviado" : "Desvio registrado no sistema"
      }];

      const { data, error } = await supabase
        .from("desvios")
        .insert({
          ...desvioData,
          history: initialHistory as any,
          created_by: user.id,
          created_by_name: userName,
        })
        .select()
        .single();
      if (error) throw error;

      // Dispara notificação WhatsApp somente se solicitado (Salvar e Enviar)
      if (notify) {
        try {
          await supabase.functions.invoke("wapi-desvio-status-notify", {
            body: {
              desvioId: data.id,
              updatedBy: userName,
              statusChanged: true,
              newStatus: desvioData.status || "Aberto"
            },
          });
        } catch (e) {
          console.warn("[wapi-desvio-status-notify] falha ao enfileirar:", e);
        }
      }

      return data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Desvio registrado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao registrar desvio");
    },
  });
}

export function useUpdateDesvio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ id, updates, action, comment, forceNotify }: { id: string; updates: Partial<Desvio>; action?: string; comment?: string; forceNotify?: boolean }) => {
      if (!user) throw new Error("Não autenticado");

      const { data: current } = await supabase.from("desvios").select("history, status").eq("id", id).single();
      const history = Array.isArray(current?.history) ? current.history : [];
      
      const isStatusChange = updates.status && updates.status !== current?.status;

      if (action) {
        history.push({
          date: new Date().toISOString(),
          user: profile?.full_name || "Usuário",
          action: action,
          comment: comment || "Alteração realizada"
        });
      }

      const { error } = await supabase
        .from("desvios")
        .update({
          ...updates,
          history: history as any
        })
        .eq("id", id);
      if (error) throw error;

      // WhatsApp somente quando explicitamente solicitado (Salvar e Enviar).
      // Mudança de status por si só NÃO envia nada.
      if (forceNotify && (updates.status === "corrigido" || updates.status === "Em Análise")) {
        supabase.functions.invoke("wapi-desvio-correction-notify", {
          body: { desvioId: id, userName: profile?.full_name || "Usuário" },
        }).catch((e) => console.warn("[wapi-desvio-correction-notify] falha:", e));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Desvio atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar desvio");
    },
  });
}

export function useUploadDesvioPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("desvios")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("desvios").getPublicUrl(path);
      return urlData.publicUrl;
    },
  });
}

export function useUpdateDesvioItems() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ desvioId, items }: { desvioId: string; items: DesvioItem[] }) => {
      const { error } = await supabase
        .from("desvios")
        .update({ items: items as any })
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
    },
  });
}

export function useAddCorrectionPhoto() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ desvioId, photoUrl }: { desvioId: string; photoUrl: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from("desvios")
        .select("correction_photo_urls, mentioned_user_id, mentioned_user_ids")
        .eq("id", desvioId)
        .single();
      if (fetchError) throw fetchError;

      const isMentioned = current.mentioned_user_id === user?.id || 
        ((current.mentioned_user_ids as string[]) || []).includes(user?.id || "");
      if (!isMentioned) {
        throw new Error("Apenas a pessoa mencionada pode adicionar foto de correção");
      }

      const updatedPhotos = [...(current.correction_photo_urls || []), photoUrl];
      const { error } = await supabase
        .from("desvios")
        .update({ correction_photo_urls: updatedPhotos })
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Foto de correção adicionada!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao adicionar foto de correção");
    },
  });
}

export function useUpdateDesvioStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ desvioId, status }: { desvioId: string; status: string }) => {
      // Fetch desvio details before updating
      const { data: desvio, error: fetchError } = await supabase
        .from("desvios")
        .select("id, description, status, items, mentioned_user_names, created_by, due_date")
        .eq("id", desvioId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("desvios")
        .update({ status })
        .eq("id", desvioId);
      if (error) throw error;

      // Send announcement to the creator when marked as corrected
      if (status === "corrigido" && user && desvio.created_by !== user.id) {
        const correctorName = profile?.full_name || "Usuário";
        const items = Array.isArray(desvio.items) ? desvio.items : [];
        const mentionedNames = ((desvio.mentioned_user_names as string[]) || []).join(", ");

        let itemDetails = "";
        if (items.length > 0) {
          itemDetails = items.map((item: any, i: number) => {
            let line = `${i + 1}. ${item.description || "Sem descrição"}`;
            if (item.correction_observation) {
              line += `\n   ✅ Observação: ${item.correction_observation}`;
            }
            return line;
          }).join("\n");
        }

        const content = [
          `O desvio que você registrou foi **corrigido** por **${correctorName}**.`,
          "",
          `📋 **Descrição:** ${desvio.description}`,
          mentionedNames ? `👤 **Responsável(is):** ${mentionedNames}` : "",
          desvio.due_date ? `📅 **Prazo:** ${new Date(desvio.due_date).toLocaleDateString("pt-BR")}` : "",
          "",
          items.length > 0 ? `📝 **Itens corrigidos:**\n${itemDetails}` : "",
        ].filter(Boolean).join("\n");

        await supabase.from("announcements").insert({
          title: "✅ Desvio Corrigido",
          content: `${content}\n<!--desvio:${desvio.id}-->`,
          created_by: user.id,
          target_type: "specific",
          target_users: [desvio.created_by],
          published_at: new Date().toISOString(),
        });
      }

      // Mudança de status NÃO envia WhatsApp — apenas "Salvar e Enviar" faz o envio.

    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}

export function useDeleteDesvio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (desvioId: string) => {
      const { error } = await supabase
        .from("desvios")
        .delete()
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Desvio excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir desvio");
    },
  });
}
