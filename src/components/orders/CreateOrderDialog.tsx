import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ImagePlus, Loader2, Sparkles, Upload, X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateOrder, uploadOrderPhoto, QuantityUnit, OrderItemInput, useProductSuggestions } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { confirmOnce } from "@/lib/pendingConfirm";
import { ProductAutocomplete } from "./ProductAutocomplete";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNIT_OPTIONS: { value: QuantityUnit; label: string }[] = [
  { value: "unidade", label: "Unidade(s)" },
  { value: "par", label: "Par(es)" },
  { value: "pecas", label: "Peça(s)" },
  { value: "centimetros", label: "Centímetros" },
  { value: "metros", label: "Metros" },
  { value: "metro_quadrado", label: "m² (Metro Quadrado)" },
  { value: "metro_cubico", label: "m³ (Metro Cúbico)" },
  { value: "quilos", label: "Quilos" },
  { value: "litros", label: "Litros" },
  { value: "galao", label: "Galão(ões)" },
  { value: "balde", label: "Balde(s)" },
  { value: "pacotes", label: "Pacotes" },
  { value: "caixas", label: "Caixas" },
  { value: "saco", label: "Saco(s)" },
  { value: "rolo", label: "Rolo(s)" },
];

const CARGO_OPTIONS = [
  { value: "aux_administrativo", label: "Aux. Administrativo" },
  { value: "aux_almoxarifado", label: "Aux. Almoxarifado" },
];

interface ItemForm {
  product_name: string;
  quantity: string;
  quantity_unit: QuantityUnit;
  description: string;
  photo_urls: string[];
}

const emptyItem: ItemForm = {
  product_name: "",
  quantity: "1",
  quantity_unit: "unidade",
  description: "",
  photo_urls: [],
};

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const [items, setItems] = useState<ItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<ItemForm>({ ...emptyItem });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [mentionedCargo, setMentionedCargo] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: productSuggestions = [] } = useProductSuggestions();

  // Photo upload for current item being edited/created
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetIndex?: number) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(uploadOrderPhoto);
      const urls = await Promise.all(uploadPromises);

      if (targetIndex !== undefined && targetIndex !== null) {
        // Adding photos to an existing item being edited
        const updated = [...items];
        updated[targetIndex] = {
          ...updated[targetIndex],
          photo_urls: [...updated[targetIndex].photo_urls, ...urls],
        };
        setItems(updated);
      } else {
        // Adding photos to the current new item form
        setCurrentItem(prev => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
      }
      toast({ title: "Fotos enviadas com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao enviar fotos", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const removePhotoFromItem = (itemIndex: number, photoIndex: number) => {
    const updated = [...items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      photo_urls: updated[itemIndex].photo_urls.filter((_, i) => i !== photoIndex),
    };
    setItems(updated);
  };

  const removePhotoFromCurrent = (photoIndex: number) => {
    setCurrentItem(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== photoIndex),
    }));
  };

  const generateAIImage = async (targetIndex?: number) => {
    const productName = targetIndex !== undefined
      ? items[targetIndex]?.product_name
      : currentItem.product_name;

    if (!productName) {
      toast({ title: "Digite o nome do produto primeiro", variant: "destructive" });
      return;
    }

    try {
      await confirmOnce(
        `ai:generate-order-image:${targetIndex ?? "new"}:${productName}`,
        "Esta ação usa IA para gerar imagem e pode consumir créditos. Deseja continuar?",
        async () => {
          setIsGeneratingAI(true);
          const { data, error } = await supabase.functions.invoke("generate-order-image", {
            body: { prompt: productName, confirmed: true },
          });

          if (error) throw error;

          if (data.imageUrl) {
            if (targetIndex !== undefined) {
              const updated = [...items];
              updated[targetIndex] = {
                ...updated[targetIndex],
                photo_urls: [...updated[targetIndex].photo_urls, data.imageUrl],
              };
              setItems(updated);
            } else {
              setCurrentItem(prev => ({ ...prev, photo_urls: [...prev.photo_urls, data.imageUrl] }));
            }
            toast({ title: "Imagem gerada com sucesso!" });
          }
        }
      );
    } catch (error) {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getMentionedUserId = async (cargo: "aux_administrativo" | "aux_almoxarifado"): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("cargo", cargo)
      .limit(1)
      .maybeSingle();
    return data?.user_id || null;
  };

  const addItem = () => {
    if (!currentItem.product_name.trim()) {
      toast({ title: "Digite o nome do produto", variant: "destructive" });
      return;
    }
    const qty = parseFloat(currentItem.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }

    setItems([...items, { ...currentItem }]);
    setCurrentItem({ ...emptyItem });
    toast({ title: "Item adicionado à lista!" });
  };

  const removeItem = (index: number) => {
    if (editingIndex === index) setEditingIndex(null);
    setItems(items.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
  };

  const stopEditing = () => {
    setEditingIndex(null);
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const onSubmit = async () => {
    let allItems = [...items];
    if (currentItem.product_name.trim()) {
      const qty = parseFloat(currentItem.quantity);
      if (!isNaN(qty) && qty > 0) {
        allItems.push({ ...currentItem });
      }
    }

    allItems = allItems.filter(item => item.product_name.trim() && parseFloat(item.quantity) > 0);

    if (allItems.length === 0) {
      toast({ title: "Adicione pelo menos um item ao pedido", variant: "destructive" });
      return;
    }

    try {
      let mentionedUserId: string | undefined;
      if (mentionedCargo) {
        const userId = await getMentionedUserId(mentionedCargo as "aux_administrativo" | "aux_almoxarifado");
        if (userId) mentionedUserId = userId;
      }

      const itemsData: OrderItemInput[] = allItems.map(item => ({
        product_name: item.product_name,
        quantity: parseFloat(item.quantity),
        quantity_unit: item.quantity_unit,
        description: item.description || undefined,
        photo_urls: item.photo_urls,
      }));

      // Collect all photos for backwards compat on the order level
      const allPhotos = allItems.flatMap(item => item.photo_urls);

      await createOrder.mutateAsync({
        items: itemsData,
        expected_date: expectedDate ? format(expectedDate, "yyyy-MM-dd") : undefined,
        photo_urls: allPhotos,
        mentioned_user_id: mentionedUserId,
        mentioned_cargo: mentionedCargo,
      });

      toast({ title: "Pedido criado com sucesso!" });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setItems([]);
    setCurrentItem({ ...emptyItem });
    setEditingIndex(null);
    setExpectedDate(undefined);
    setMentionedCargo(undefined);
  };

  const totalItems = items.length + (currentItem.product_name.trim() ? 1 : 0);

  const renderPhotos = (photos: string[], onRemove: (i: number) => void) => {
    if (photos.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-16 h-16">
            <img loading="lazy" decoding="async" src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-md" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderPhotoActions = (targetIndex?: number) => {
    const inputId = targetIndex !== undefined ? `photo-upload-${targetIndex}` : "photo-upload-new";
    return (
      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          Fotos
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGeneratingAI}
          onClick={() => generateAIImage(targetIndex)}
        >
          {isGeneratingAI ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          IA
        </Button>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoUpload(e, targetIndex)}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Added Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Itens do Pedido
                <Badge variant="secondary">{items.length}</Badge>
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map((item, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardContent className="p-3">
                      {editingIndex === index ? (
                        // Editing mode
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Editando Item</Label>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={stopEditing}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                          <ProductAutocomplete
                            value={item.product_name}
                            onChange={(v) => updateItem(index, "product_name", v)}
                            suggestions={productSuggestions}
                            placeholder="Nome do Produto"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            />
                            <Select
                              value={item.quantity_unit}
                              onValueChange={(v) => updateItem(index, "quantity_unit", v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            rows={2}
                          />
                          {renderPhotos(item.photo_urls, (pi) => removePhotoFromItem(index, pi))}
                          {renderPhotoActions(index)}
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between gap-3">
                          {item.photo_urls.length > 0 && (
                            <div className="flex gap-1 flex-shrink-0">
                              {item.photo_urls.slice(0, 3).map((url, pi) => (
                                <img loading="lazy" decoding="async" key={pi} src={url} alt="" className="w-12 h-12 object-cover rounded-md" />
                              ))}
                              {item.photo_urls.length > 3 && (
                                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                  +{item.photo_urls.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} {UNIT_OPTIONS.find(u => u.value === item.quantity_unit)?.label}
                            </div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Add New Item Form */}
          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <Label className="font-medium">
              {items.length > 0 ? "Adicionar outro item" : "Adicionar Item"}
            </Label>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Nome do Produto *</Label>
                <ProductAutocomplete
                  value={currentItem.product_name}
                  onChange={(value) => setCurrentItem({ ...currentItem, product_name: value })}
                  suggestions={productSuggestions}
                  placeholder="Ex: Parafusos Phillips 6mm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Quantidade *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Unidade *</Label>
                  <Select
                    value={currentItem.quantity_unit}
                    onValueChange={(v) => setCurrentItem({ ...currentItem, quantity_unit: v as QuantityUnit })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm">Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes adicionais..."
                  value={currentItem.description}
                  onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Photos for current item */}
              {renderPhotos(currentItem.photo_urls, removePhotoFromCurrent)}
              {renderPhotoActions()}

              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item à Lista
              </Button>
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !expectedDate && "text-muted-foreground")}
                  >
                    {expectedDate ? format(expectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expectedDate} onSelect={setExpectedDate} disabled={(date) => date < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Encaminhar para</Label>
              <Select value={mentionedCargo} onValueChange={setMentionedCargo}>
                <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>
                  {CARGO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={createOrder.isPending || totalItems === 0}>
              {createOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Pedido {totalItems > 0 && `(${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
