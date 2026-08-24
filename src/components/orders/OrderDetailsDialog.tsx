import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Package, User, History, Trash2, Edit2, ImageIcon, ArrowRight, Hash, Copy, List, MessageCircle, Check, X, XCircle, Upload, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order, OrderStatus, QuantityUnit, useOrderHistory, useUpdateOrderStatus, useUpdateOrderQuantity, useDeleteOrder, useOrderItems, useUpdateOrderItem, useDeleteOrderItem, uploadOrderPhoto } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { PhotoViewer } from "./PhotoViewer";
import { ExportOrderPdfButton } from "./ExportOrderPdfButton";
import { DeliveryConfirmationDialog } from "./DeliveryConfirmationDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "bg-yellow-500" },
  em_analise: { label: "Em Análise", color: "bg-orange-500" },
  aprovado: { label: "Aprovado", color: "bg-blue-500" },
  comprado: { label: "Comprado", color: "bg-emerald-500" },
  a_caminho: { label: "A Caminho", color: "bg-purple-500" },
  entregue: { label: "Entregue", color: "bg-green-500" },
  pedido_realizado: { label: "Pedido Realizado", color: "bg-cyan-500" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
  recusado: { label: "Recusado", color: "bg-red-700" },
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "Unidade(s)",
  par: "Par(es)",
  pecas: "Peça(s)",
  centimetros: "Centímetros",
  metros: "Metros",
  metro_quadrado: "m² (Metro Quadrado)",
  metro_cubico: "m³ (Metro Cúbico)",
  quilos: "Quilos",
  litros: "Litros",
  galao: "Galão(ões)",
  balde: "Balde(s)",
  pacotes: "Pacotes",
  caixas: "Caixas",
  saco: "Saco(s)",
  rolo: "Rolo(s)",
};

const UNIT_OPTIONS: { value: QuantityUnit; label: string }[] = [
  { value: "unidade", label: "Unidade(s)" },
  { value: "par", label: "Par(es)" },
  { value: "pecas", label: "Peça(s)" },
  { value: "centimetros", label: "Centímetros" },
  { value: "metros", label: "Metros" },
  { value: "metro_quadrado", label: "m²" },
  { value: "metro_cubico", label: "m³" },
  { value: "quilos", label: "Quilos" },
  { value: "litros", label: "Litros" },
  { value: "galao", label: "Galão(ões)" },
  { value: "balde", label: "Balde(s)" },
  { value: "pacotes", label: "Pacotes" },
  { value: "caixas", label: "Caixas" },
  { value: "saco", label: "Saco(s)" },
  { value: "rolo", label: "Rolo(s)" },
];

import { formatCargoLabel } from "@/lib/cargoUtils";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<string | null>(null);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<QuantityUnit>("unidade");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQty, setEditItemQty] = useState<number>(0);
  const [editItemUnit, setEditItemUnit] = useState<QuantityUnit>("unidade");
  const [editItemDesc, setEditItemDesc] = useState("");
  const itemPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTargetItemId, setPhotoTargetItemId] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const updateQuantity = useUpdateOrderQuantity();
  const deleteOrder = useDeleteOrder();
  const updateItem = useUpdateOrderItem();
  const deleteItem = useDeleteOrderItem();
  const { data: history } = useOrderHistory(order?.id || "");
  const { data: orderItems } = useOrderItems(order?.id || "");

  if (!order) return null;

  const canChangeStatus = 
    user?.id === order.mentioned_user_id ||
    profile?.cargo === "aux_administrativo" ||
    profile?.cargo === "aux_almoxarifado" ||
    isAdmin;

  const canEditQuantity = 
    profile?.cargo === "aux_administrativo" ||
    profile?.cargo === "aux_almoxarifado";

  const canDelete = order.status === "solicitado" && (
    user?.id === order.requester_id ||
    profile?.cargo === "aux_administrativo" ||
    isAdmin
  );
  // Allow editing items (name, qty, photos) at any time except after delivery/cancel
  // for the requester, admins or aux administrativo/almoxarifado.
  const canEditItems = order.status !== "entregue" && order.status !== "cancelado" && (
    user?.id === order.requester_id ||
    profile?.cargo === "aux_administrativo" ||
    profile?.cargo === "aux_almoxarifado" ||
    isAdmin
  );
  const isCancelled = order.status === "cancelado";

  const allImages = [
    ...(order.photo_urls || []),
    ...(order.ai_generated_image_url ? [order.ai_generated_image_url] : []),
  ];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    // If changing to "entregue", show delivery confirmation dialog
    if (newStatus === "entregue") {
      setShowDeliveryDialog(true);
      return;
    }
    
    try {
      await updateStatus.mutateAsync({ orderId: order.id, newStatus });
      toast({ title: "Status atualizado!" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleDeliveryConfirmed = async () => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, newStatus: "entregue" });
      toast({ title: "Pedido marcado como entregue!" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleStartEditQuantity = () => {
    setNewQuantity(order.quantity);
    setNewUnit(order.quantity_unit);
    setEditingQuantity(true);
  };

  const handleSaveQuantity = async () => {
    try {
      await updateQuantity.mutateAsync({
        orderId: order.id,
        newQuantity,
        newUnit,
      });
      toast({ title: "Quantidade atualizada!" });
      setEditingQuantity(false);
    } catch {
      toast({ title: "Erro ao atualizar quantidade", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrder.mutateAsync(order.id);
      toast({ title: "Pedido excluído!" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    }
  };

  const openPhotoViewer = (index: number) => {
    setPhotoIndex(index);
    setPhotoViewerOpen(true);
  };

  const handleRemovePhoto = async (url: string) => {
    try {
      const isAiImage = url === order.ai_generated_image_url;
      const updateData: Record<string, any> = {};

      if (isAiImage) {
        updateData.ai_generated_image_url = null;
      } else {
        const newPhotoUrls = (order.photo_urls || []).filter((u) => u !== url);
        updateData.photo_urls = newPhotoUrls;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (error) throw error;

      toast({ title: "Foto removida!" });
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    } catch {
      toast({ title: "Erro ao remover foto", variant: "destructive" });
    }
  };

  const handleStartEditItem = (item: { id: string; product_name: string; quantity: number; quantity_unit: QuantityUnit; description: string | null }) => {
    setEditingItemId(item.id);
    setEditItemName(item.product_name);
    setEditItemQty(item.quantity);
    setEditItemUnit(item.quantity_unit as QuantityUnit);
    setEditItemDesc(item.description || "");
  };

  const handleSaveItem = async () => {
    if (!editingItemId) return;
    try {
      await updateItem.mutateAsync({
        itemId: editingItemId,
        orderId: order.id,
        product_name: editItemName,
        quantity: editItemQty,
        quantity_unit: editItemUnit,
        description: editItemDesc || null,
      });
      toast({ title: "Item atualizado!" });
      setEditingItemId(null);
    } catch {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync({ itemId, orderId: order.id });
      toast({ title: "Item removido!" });
      setShowDeleteItemConfirm(null);
    } catch {
      toast({ title: "Erro ao remover item", variant: "destructive" });
    }
  };

  // ----- Item photos management -----

  const triggerItemPhotoUpload = (itemId: string) => {
    setPhotoTargetItemId(itemId);
    setTimeout(() => itemPhotoInputRef.current?.click(), 0);
  };

  const handleItemPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !photoTargetItemId) {
      e.target.value = "";
      return;
    }
    const targetId = photoTargetItemId;
    const target = orderItems?.find((it) => it.id === targetId) as any;
    if (!target) {
      e.target.value = "";
      return;
    }
    setUploadingItemId(targetId);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadOrderPhoto));
      const newPhotos = [...((target.photo_urls as string[]) || []), ...urls];
      await updateItem.mutateAsync({
        itemId: targetId,
        orderId: order.id,
        photo_urls: newPhotos,
      });
      toast({ title: "Foto(s) adicionada(s)!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploadingItemId(null);
      setPhotoTargetItemId(null);
      e.target.value = "";
    }
  };

  const handleRemoveItemPhoto = async (itemId: string, photoUrl: string) => {
    const target = orderItems?.find((it) => it.id === itemId) as any;
    if (!target) return;
    const newPhotos = ((target.photo_urls as string[]) || []).filter((u) => u !== photoUrl);
    try {
      await updateItem.mutateAsync({
        itemId,
        orderId: order.id,
        photo_urls: newPhotos,
      });
      toast({ title: "Foto removida!" });
    } catch {
      toast({ title: "Erro ao remover foto", variant: "destructive" });
    }
  };

  const generateWhatsAppMessage = () => {
    const statusLabel = STATUS_CONFIG[order.status].label;
    const unitLabel = UNIT_LABELS[order.quantity_unit] || order.quantity_unit;
    
    // Emoji literal UTF-8 para compatibilidade total com WhatsApp
    let message = `📦 *PEDIDO Nº ${order.order_number}*\n\n`;
    message += `*Produto:* ${order.product_name}\n`;
    if (order.description) message += `*Descrição:* ${order.description}\n`;
    message += `*Quantidade:* ${order.quantity} ${unitLabel}\n`;
    message += `*Status:* ${statusLabel}\n`;
    message += `*Solicitante:* ${order.requester_name}\n`;
    message += `*Data:* ${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    if (order.expected_date) {
      message += `*Previsão:* ${format(new Date(`${order.expected_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}\n`;
    }
    // Show user name if available, otherwise show cargo
    if (order.mentioned_user_name) {
      message += `*Encaminhado para:* ${order.mentioned_user_name}\n`;
    } else if (order.mentioned_cargo) {
      message += `*Encaminhado para:* ${formatCargoLabel(order.mentioned_cargo)}\n`;
    }
    
    return encodeURIComponent(message);
  };

  const handleWhatsAppOrder = async () => {
    const message = generateWhatsAppMessage();
    const ok = await copyAndShareWhatsApp(decodeURIComponent(message));
    if (ok) toast({ title: "Enviado para WhatsApp!" });
    else toast({ title: "Erro ao compartilhar", variant: "destructive" });
  };

  const handleCopyOrder = async () => {
    const message = generateWhatsAppMessage();
    const ok = await copyToClipboard(decodeURIComponent(message));
    if (ok) toast({ title: "Pedido copiado!" });
    else toast({ title: "Erro ao copiar", variant: "destructive" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pedido #{order.order_number}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <ExportOrderPdfButton order={order} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleWhatsAppOrder}>
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar via WhatsApp</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleCopyOrder}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar pedido</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Order Number Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-sm">
                  <Hash className="w-3 h-3 mr-1" />
                  {order.order_number}
                </Badge>
                <Badge variant={STATUS_CONFIG[order.status].color.replace("bg-", "") as any}>
                  {STATUS_CONFIG[order.status].label}
                </Badge>
              </div>

              {/* Order Items Table */}
              {orderItems && orderItems.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Itens do Pedido ({orderItems.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right w-[100px]">Qtd</TableHead>
                          <TableHead className="w-[120px]">Unidade</TableHead>
                          {canEditItems && <TableHead className="w-[80px]">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          editingItemId === item.id ? (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <Input
                                  value={editItemName}
                                  onChange={(e) => setEditItemName(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="Nome do produto"
                                />
                                <Input
                                  value={editItemDesc}
                                  onChange={(e) => setEditItemDesc(e.target.value)}
                                  className="h-7 text-xs mt-1"
                                  placeholder="Descrição (opcional)"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editItemQty}
                                  onChange={(e) => setEditItemQty(parseFloat(e.target.value))}
                                  className="h-8 text-sm w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={editItemUnit} onValueChange={(v) => setEditItemUnit(v as QuantityUnit)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNIT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveItem} disabled={updateItem.isPending}>
                                    <Check className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItemId(null)}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow key={item.id}>
                              <TableCell className={`font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                                {index + 1}
                              </TableCell>
                              <TableCell className={isCancelled ? "line-through text-muted-foreground" : ""}>
                                <div className="flex items-center gap-2">
                                  {/* Item photos */}
                                  {(item as any).photo_urls && (item as any).photo_urls.length > 0 && (
                                    <div className="flex flex-wrap gap-1 flex-shrink-0">
                                      {((item as any).photo_urls as string[]).map((url: string, i: number) => (
                                        <div key={i} className="relative w-10 h-10">
                                          <img loading="lazy" decoding="async"
                                            src={url}
                                            alt={`Foto ${i + 1}`}
                                            className="w-10 h-10 rounded object-cover border border-background"
                                          />
                                          {canEditItems && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveItemPhoto(item.id, url)}
                                              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
                                              aria-label="Remover foto"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">{item.product_name}</span>
                                    {item.description && (
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                                {item.quantity}
                              </TableCell>
                              <TableCell className={isCancelled ? "line-through text-muted-foreground" : ""}>
                                {UNIT_LABELS[item.quantity_unit] || item.quantity_unit}
                              </TableCell>
                              {canEditItems && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => triggerItemPhotoUpload(item.id)}
                                      disabled={uploadingItemId === item.id}
                                      title="Adicionar foto"
                                    >
                                      {uploadingItemId === item.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Upload className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditItem(item)}>
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDeleteItemConfirm(item.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                /* Fallback: Show main product info for legacy orders */
                <div>
                  <h3 className={`text-xl font-bold ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                    {order.product_name}
                  </h3>
                  {order.description && (
                    <p className={`mt-1 ${isCancelled ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                      {order.description}
                    </p>
                  )}
                </div>
              )}

              {/* Images - Clickable */}
              {allImages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Fotos do Produto (clique para ampliar)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allImages.map((url, index) => (
                      <div key={index} className="relative">
                        <button
                          onClick={() => openPhotoViewer(index)}
                          className="relative w-24 h-24 rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all group"
                        >
                          <img loading="lazy" decoding="async"
                            src={url}
                            alt={`Imagem ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {url === order.ai_generated_image_url && (
                            <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[10px] text-center py-0.5">
                              IA
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                        {canEditItems && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(url);
                            }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 transition-colors z-10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity - Only show for legacy orders without items */}
              {(!orderItems || orderItems.length === 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantidade</span>
                    {canEditQuantity && !isCancelled && order.status !== "entregue" && !editingQuantity && (
                      <Button variant="ghost" size="sm" onClick={handleStartEditQuantity}>
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                  
                  {editingQuantity ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(parseFloat(e.target.value))}
                        className="w-24"
                      />
                      <Select value={newUnit} onValueChange={(v) => setNewUnit(v as QuantityUnit)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleSaveQuantity} disabled={updateQuantity.isPending}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingQuantity(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <p className={`font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                      {order.quantity} {UNIT_LABELS[order.quantity_unit]}
                    </p>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[order.status].color}`} />
                    <span className={`font-medium ${isCancelled ? "line-through" : ""}`}>
                      {STATUS_CONFIG[order.status].label}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Solicitante
                  </span>
                  <p className="font-medium">{order.requester_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data da Solicitação
                  </span>
                  <p className="font-medium">
                    {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {order.expected_date && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Previsão de Entrega
                    </span>
                    <p className={`font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                      {format(new Date(`${order.expected_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {order.mentioned_cargo && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Encaminhado para</span>
                    <p className="font-medium">{formatCargoLabel(order.mentioned_cargo)}</p>
                  </div>
                )}
              </div>

              {/* Status Change */}
              {canChangeStatus && order.status !== "entregue" && order.status !== "cancelado" && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Alterar Status</h4>
                    <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solicitado">Solicitado</SelectItem>
                        <SelectItem value="em_analise">Em Análise</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="comprado">Comprado</SelectItem>
                        <SelectItem value="a_caminho">A Caminho</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                        <SelectItem value="pedido_realizado">Pedido Realizado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="recusado">Recusado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* History */}
              {history && history.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <History className="w-4 h-4" /> Histórico
                    </h4>
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div key={h.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{h.changed_by_name}</span>
                            {(h as any).change_type === "quantity" ? (
                              <>
                                <span className="text-muted-foreground">alterou quantidade:</span>
                                <span className="line-through text-muted-foreground">
                                  {(h as any).previous_quantity} {(h as any).previous_unit}
                                </span>
                                <ArrowRight className="w-3 h-3" />
                                <Badge variant="outline">
                                  {(h as any).new_quantity} {(h as any).new_unit}
                                </Badge>
                              </>
                            ) : (
                              <>
                                <span className="text-muted-foreground">alterou status para</span>
                                <Badge 
                                  variant={h.new_status === "cancelado" ? "destructive" : "outline"}
                                  className={h.new_status === "cancelado" ? "" : ""}
                                >
                                  {STATUS_CONFIG[h.new_status].label}
                                </Badge>
                              </>
                            )}
                          </div>
                          {h.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{h.notes}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Delete Button */}
              {canDelete && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Pedido
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden input used for adding photos to an item */}
      <input
        ref={itemPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleItemPhotosChange}
      />

      {/* Photo Viewer */}
      <PhotoViewer
        photos={order.photo_urls || []}
        aiImageUrl={order.ai_generated_image_url}
        initialIndex={photoIndex}
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showDeleteItemConfirm} onOpenChange={(open) => !open && setShowDeleteItemConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item será removido do pedido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteItemConfirm && handleDeleteItem(showDeleteItemConfirm)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Confirmation Dialog */}
      <DeliveryConfirmationDialog
        order={order}
        orderItems={orderItems}
        open={showDeliveryDialog}
        onOpenChange={setShowDeliveryDialog}
        onConfirm={handleDeliveryConfirmed}
      />
    </>
  );
}
