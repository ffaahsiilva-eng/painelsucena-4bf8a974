import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

export interface StorageLocation {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  ca_number: string | null;
  ca_expiry: string | null;
  location_id: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  storage_locations?: StorageLocation | null;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: "entrada" | "saida" | "ajuste";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  moved_by: string;
  moved_by_name: string;
  destination_type: string | null;
  destination_id: string | null;
  destination_name: string | null;
  created_at: string;
}

export interface CreateItemData {
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  ca_number?: string;
  ca_expiry?: string;
  location_id?: string;
  notes?: string;
  photo_urls?: string[];
}

export interface UpdateItemData extends Partial<CreateItemData> {
  id: string;
}

export interface MovementData {
  item_id: string;
  movement_type: "entrada" | "saida" | "ajuste";
  quantity: number;
  reason?: string;
  destination_type?: string;
  destination_id?: string;
  destination_name?: string;
}

export function useStorageLocations() {
  return useQuery({
    queryKey: ["storage-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as StorageLocation[];
    },
  });
}

export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, quantity, min_quantity, unit, ca_number, ca_expiry, location_id, storage_locations(id, name)")
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useInventoryMovements(itemId?: string) {
  return useQuery({
    queryKey: ["inventory-movements", itemId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_movements")
        .select("id, item_id, movement_type, quantity, previous_quantity, new_quantity, reason, moved_by_name, destination_name, created_at")
        .order("created_at", { ascending: false });

      if (itemId) {
        query = query.eq("item_id", itemId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!itemId || itemId === undefined,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateItemData) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data: newItem, error } = await supabase
        .from("inventory_items")
        .insert({
          ...data,
          created_by: user.id,
        })
        .select("*, storage_locations(*)")
        .single();

      if (error) throw error;
      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: "Item adicionado",
        description: "O item foi adicionado ao estoque com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateItemData) => {
      const { data: updatedItem, error } = await supabase
        .from("inventory_items")
        .update(data)
        .eq("id", id)
        .select("*, storage_locations(*)")
        .single();

      if (error) throw error;
      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: "Item atualizado",
        description: "O item foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({
        title: "Item removido",
        description: "O item foi removido do estoque.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRecordMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MovementData) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Get current item quantity
      const { data: item, error: fetchError } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("id", data.item_id)
        .single();

      if (fetchError) throw fetchError;

      const previousQuantity = item.quantity;
      let newQuantity = previousQuantity;

      if (data.movement_type === "entrada") {
        newQuantity = previousQuantity + data.quantity;
      } else if (data.movement_type === "saida") {
        newQuantity = previousQuantity - data.quantity;
        if (newQuantity < 0) {
          throw new Error("Quantidade insuficiente em estoque");
        }
      } else {
        newQuantity = data.quantity; // ajuste direto
      }

      // Update item quantity
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ quantity: newQuantity })
        .eq("id", data.item_id);

      if (updateError) throw updateError;

      // Record movement
      const { data: movement, error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          item_id: data.item_id,
          movement_type: data.movement_type,
          quantity: data.quantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reason: data.reason,
          moved_by: user.id,
          moved_by_name: profile?.full_name || "Usuário",
          destination_type: data.destination_type || null,
          destination_id: data.destination_id || null,
          destination_name: data.destination_name || null,
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Envia ao grupo do WhatsApp toda alteração de quantidade com o motivo.
      try {
        await supabase.functions.invoke("wapi-inventory-change-notify", {
          body: {
            item_id: data.item_id,
            movement_id: movement?.id,
            movement_type: data.movement_type,
            quantity: data.quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reason: data.reason || null,
            moved_by_name: profile?.full_name || "Usuário",
            destination_name: data.destination_name || null,
          },
        });
      } catch (e) {
        console.warn("[inventory-change-notify] falha ao enfileirar:", e);
      }

      // Dispara alerta de estoque baixo / zerado se cruzar o limite
      try {
        const { data: itemAfter } = await supabase
          .from("inventory_items")
          .select("quantity, min_quantity")
          .eq("id", data.item_id)
          .maybeSingle();
        const qty = Number(itemAfter?.quantity ?? newQuantity);
        const min = Number(itemAfter?.min_quantity ?? 0);
        const wasOk = previousQuantity > min;
        const isNowLowOrZero = qty <= 0 || qty <= min;
        if (wasOk && isNowLowOrZero) {
          await supabase.functions.invoke("wapi-low-stock-notify", {
            body: {
              item_id: data.item_id,
              movement_type: data.movement_type,
              moved_by_name: profile?.full_name || "Usuário",
              reason: data.reason || null,
              destination_name: data.destination_name || null,
            },
          });
        }
      } catch (e) {
        console.warn("[low-stock-notify] falha ao enfileirar alerta:", e);
      }

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      toast({
        title: "Movimentação registrada",
        description: "A movimentação foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na movimentação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: newLocation, error } = await supabase
        .from("storage_locations")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return newLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      toast({
        title: "Local adicionado",
        description: "O local de armazenamento foi adicionado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar local",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
