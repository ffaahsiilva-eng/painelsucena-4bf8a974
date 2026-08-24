import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OrderStatus = 'solicitado' | 'aprovado' | 'a_caminho' | 'entregue' | 'pedido_realizado' | 'cancelado' | 'em_analise' | 'comprado' | 'recusado';
export type QuantityUnit = 'unidade' | 'centimetros' | 'metros' | 'quilos' | 'litros' | 'pacotes' | 'caixas' | 'pecas' | 'par' | 'rolo' | 'saco' | 'galao' | 'balde' | 'metro_quadrado' | 'metro_cubico';

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  quantity_unit: QuantityUnit;
  description: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  requester_id: string;
  requester_name: string;
  product_name: string;
  description: string | null;
  quantity: number;
  quantity_unit: QuantityUnit;
  expected_date: string | null;
  status: OrderStatus;
  photo_urls: string[];
  ai_generated_image_url: string | null;
  mentioned_user_id: string | null;
  mentioned_cargo: string | null;
  mentioned_user_name?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderHistory {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  changed_by_name: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItemInput {
  product_name: string;
  quantity: number;
  quantity_unit: QuantityUnit;
  description?: string;
  photo_urls?: string[];
}

export interface CreateOrderData {
  items: OrderItemInput[];
  expected_date?: string;
  photo_urls?: string[];
  ai_generated_image_url?: string;
  mentioned_user_id?: string;
  mentioned_cargo?: string;
}

const fetchOrdersWithMentionedNames = async (orders: any[]): Promise<Order[]> => {
  if (!orders || orders.length === 0) return [];
  
  // Get unique mentioned user IDs
  const mentionedUserIds = [...new Set(orders
    .filter(o => o.mentioned_user_id)
    .map(o => o.mentioned_user_id)
  )];
  
  if (mentionedUserIds.length === 0) {
    return orders as Order[];
  }
  
  // Fetch profiles for mentioned users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", mentionedUserIds);
  
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
  
  return orders.map(order => ({
    ...order,
    mentioned_user_name: order.mentioned_user_id ? profileMap.get(order.mentioned_user_id) || null : null,
  })) as Order[];
};

export const useOrders = () => {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, requester_id, requester_name, product_name, status, expected_date, created_at, mentioned_user_id, mentioned_cargo")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return fetchOrdersWithMentionedNames(data || []);
    },
  });
};

export const useMyOrders = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, requester_id, requester_name, product_name, status, expected_date, created_at, mentioned_user_id, mentioned_cargo")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return fetchOrdersWithMentionedNames(data || []);
    },
    enabled: !!user?.id,
  });
};

export const usePendingOrders = () => {
  return useQuery({
    queryKey: ["pending-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, requester_id, requester_name, product_name, status, expected_date, created_at, mentioned_user_id, mentioned_cargo")
        .in("status", ["solicitado", "aprovado", "a_caminho"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return fetchOrdersWithMentionedNames(data || []);
    },
  });
};

export const useOrderHistory = (orderId: string) => {
  return useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_history")
        .select("id, order_id, previous_status, new_status, changed_by, changed_by_name, notes, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderHistory[];
    },
    enabled: !!orderId,
  });
};

export const useOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, product_name, quantity, quantity_unit, description, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });
};

export const useProductSuggestions = () => {
  return useQuery({
    queryKey: ["product-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_name")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique product names (case-insensitive)
      const uniqueProducts = new Map<string, string>();
      data.forEach((item) => {
        const key = item.product_name.toLowerCase();
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, item.product_name);
        }
      });

      return Array.from(uniqueProducts.values());
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error("Adicione pelo menos um item ao pedido");
      }

      // Get user's profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      // Use first item as the main product (for backwards compatibility)
      const firstItem = orderData.items[0];
      const totalItems = orderData.items.length;
      const productSummary = totalItems === 1 
        ? firstItem.product_name 
        : `${firstItem.product_name} (+${totalItems - 1} itens)`;

      const { data, error } = await supabase
        .from("orders")
        .insert({
          product_name: productSummary,
          description: totalItems > 1 ? `Pedido com ${totalItems} itens` : firstItem.description,
          quantity: firstItem.quantity,
          quantity_unit: firstItem.quantity_unit,
          expected_date: orderData.expected_date,
          photo_urls: orderData.photo_urls,
          ai_generated_image_url: orderData.ai_generated_image_url,
          mentioned_user_id: orderData.mentioned_user_id,
          mentioned_cargo: orderData.mentioned_cargo,
          requester_id: user.id,
          requester_name: profile?.full_name || "Usuário",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert all items
      const itemsToInsert = orderData.items.map(item => ({
        order_id: data.id,
        product_name: item.product_name,
        quantity: item.quantity,
        quantity_unit: item.quantity_unit,
        description: item.description || null,
        photo_urls: item.photo_urls || [],
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create notification and on-screen announcement for mentioned user
      if (orderData.mentioned_user_id) {
        const itemsList = orderData.items.map(i => `• ${i.quantity} ${i.quantity_unit} de ${i.product_name}`).join('\n');
        const requesterName = profile?.full_name || "Alguém";

        await supabase.from("notifications").insert({
          user_id: orderData.mentioned_user_id,
          title: "📦 Novo Pedido - Aguardando Solicitação",
          message: `${requesterName} fez um pedido com ${totalItems} item(ns) e está aguardando sua análise.`,
          type: "order",
          reference_id: data.id,
          reference_type: "order",
        });

        // On-screen announcement (modal) for the mentioned user
        const announcementContent = `**${requesterName}** encaminhou um novo pedido para você:\n\n${itemsList}\n\nVerifique os detalhes no painel de pedidos.`;

        await supabase.from("announcements").insert({
          title: "📦 Novo Pedido Recebido",
          content: announcementContent,
          created_by: user.id,
          target_type: "specific",
          target_users: [orderData.mentioned_user_id],
          published_at: new Date().toISOString(),
        });

      }

      // WhatsApp notification - enqueued to mentioned user (rerouted to group) or group directly
      supabase.functions.invoke("wapi-order-notify", {
        body: {
          orderId: data.id,
          eventType: "created",
        },
      }).catch((e) => console.warn("[wapi-order-notify creation] falhou:", e));



      // Notifications and group routing are handled by the database or worker
      // to avoid duplicates and ensure correct routing to group_id_orders.


      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      notes,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get current order
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status, requester_id, product_name, order_number")
        .eq("id", orderId)
        .single();

      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      // Update order status - ensure lowercase enum value
      const safeNewStatus = newStatus.toLowerCase() as OrderStatus;
      const { data, error } = await supabase
        .from("orders")
        .update({ status: safeNewStatus, notes })
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("[ORDER_UPDATE] Error:", error);
        throw error;
      }

      // Create history entry
      const safePreviousStatus = currentOrder?.status ? (currentOrder.status as string).toLowerCase() as OrderStatus : null;
      await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: safePreviousStatus,
        new_status: safeNewStatus,
        changed_by: user.id,
        changed_by_name: profile?.full_name || "Usuário",
        notes,
      } as any);

      // Notify requester of status change
      if (currentOrder?.requester_id && currentOrder.requester_id !== user.id) {
        const statusLabels: Record<OrderStatus, string> = {
          solicitado: "Solicitado",
          em_analise: "Em Análise 🔍",
          aprovado: "Aprovado ✅",
          comprado: "Comprado 🛒",
          a_caminho: "A Caminho 🚚",
          entregue: "Entregue 📬",
          pedido_realizado: "Pedido Realizado 📦",
          cancelado: "Cancelado ❌",
          recusado: "Recusado 🚫",
        };

        await supabase.from("notifications").insert({
          user_id: currentOrder.requester_id,
          title: "📦 Atualização de Pedido",
          message: `Seu pedido foi atualizado para: ${statusLabels[safeNewStatus] || safeNewStatus}`,
          type: "order",
          reference_id: orderId,
          reference_type: "order",
        });

        // Create on-screen announcement for the requester
        const changerName = profile?.full_name || "Usuário";
        const productName = currentOrder.product_name || "Pedido";
        const orderNum = currentOrder.order_number || "";
        const announcementContent = `Seu pedido "${productName}"${orderNum ? ` (Nº ${orderNum})` : ""} teve o status alterado para **${statusLabels[safeNewStatus] || safeNewStatus}** por **${changerName}**.`;

        await supabase.from("announcements").insert({
          title: "📦 Atualização de Pedido",
          content: announcementContent,
          created_by: user.id,
          target_type: "specific",
          target_users: [currentOrder.requester_id],
          published_at: new Date().toISOString(),
        });

        // Auto WhatsApp para o solicitante (fire-and-forget)
        supabase.functions.invoke("wapi-order-notify", {
          body: {
            orderId,
            eventType: "status_changed",
            oldStatus: safePreviousStatus,
            newStatus: safeNewStatus,
            changerName,
          },
        }).catch((e) => console.warn("[wapi-order-notify status] falhou:", e));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
  });
};

export const useUpdateOrderQuantity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      orderId,
      newQuantity,
      newUnit,
      notes,
    }: {
      orderId: string;
      newQuantity: number;
      newUnit?: QuantityUnit;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get current order
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("quantity, quantity_unit, requester_id")
        .eq("id", orderId)
        .single();

      if (!currentOrder) throw new Error("Pedido não encontrado");

      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const updateData: { quantity: number; quantity_unit?: QuantityUnit } = {
        quantity: newQuantity,
      };
      if (newUnit) updateData.quantity_unit = newUnit;

      // Update order quantity
      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Create history entry for quantity change
      await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: null,
        new_status: "solicitado", // Required field, use current status
        changed_by: user.id,
        changed_by_name: profile?.full_name || "Usuário",
        notes: notes || `Quantidade alterada de ${currentOrder.quantity} para ${newQuantity}`,
        previous_quantity: currentOrder.quantity,
        new_quantity: newQuantity,
        previous_unit: currentOrder.quantity_unit,
        new_unit: newUnit || currentOrder.quantity_unit,
        change_type: "quantity",
      });

      // Notify requester
      if (currentOrder.requester_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: currentOrder.requester_id,
          title: "📦 Quantidade Alterada",
          message: `A quantidade do seu pedido foi alterada de ${currentOrder.quantity} para ${newQuantity}`,
          type: "order",
          reference_id: orderId,
          reference_type: "order",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

// Re-sync the order's product_name + photo_urls + quantity to reflect the
// current items (so the card title and previews update after edits/removals).
const syncOrderSummary = async (orderId: string) => {
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (!items || items.length === 0) return;

  const first = items[0] as any;
  const totalItems = items.length;
  const productSummary = totalItems === 1
    ? first.product_name
    : `${first.product_name} (+${totalItems - 1} itens)`;

  const allPhotos = items.flatMap((it: any) => it.photo_urls || []);

  await supabase
    .from("orders")
    .update({
      product_name: productSummary,
      description: totalItems > 1 ? `Pedido com ${totalItems} itens` : (first.description ?? null),
      quantity: first.quantity,
      quantity_unit: first.quantity_unit,
      photo_urls: allPhotos,
    })
    .eq("id", orderId);
};

export const useUpdateOrderItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      orderId,
      product_name,
      quantity,
      quantity_unit,
      description,
      photo_urls,
    }: {
      itemId: string;
      orderId?: string;
      product_name?: string;
      quantity?: number;
      quantity_unit?: QuantityUnit;
      description?: string | null;
      photo_urls?: string[];
    }) => {
      const updateData: Record<string, any> = {};
      if (product_name !== undefined) updateData.product_name = product_name;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (quantity_unit !== undefined) updateData.quantity_unit = quantity_unit;
      if (description !== undefined) updateData.description = description;
      if (photo_urls !== undefined) updateData.photo_urls = photo_urls;

      const { data, error } = await supabase
        .from("order_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      const targetOrderId = orderId || (data as any)?.order_id;
      if (targetOrderId) await syncOrderSummary(targetOrderId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

export const useDeleteOrderItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, orderId }: { itemId: string; orderId?: string }) => {
      // Try to capture order_id before deleting if not provided
      let targetOrderId = orderId;
      if (!targetOrderId) {
        const { data: existing } = await supabase
          .from("order_items")
          .select("order_id")
          .eq("id", itemId)
          .maybeSingle();
        targetOrderId = (existing as any)?.order_id;
      }

      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      if (targetOrderId) await syncOrderSummary(targetOrderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

export const uploadOrderPhoto = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("order-photos")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("order-photos")
    .getPublicUrl(fileName);

  return data.publicUrl;
};
