import { useState, useEffect } from "react";
import { Package, MapPin, Hash, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Order, OrderItem, QuantityUnit } from "@/hooks/useOrders";
import { useCreateItem } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";

interface DeliveryConfirmationDialogProps {
  order: Order | null;
  orderItems: OrderItem[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const UNIT_LABELS: Record<string, string> = {
  unidade: "Unidade(s)",
  par: "Par(es)",
  pecas: "Peça(s)",
  centimetros: "Centímetros",
  metros: "Metros",
  metro_quadrado: "m²",
  metro_cubico: "m³",
  quilos: "Quilos",
  litros: "Litros",
  galao: "Galão(ões)",
  balde: "Balde(s)",
  pacotes: "Pacotes",
  caixas: "Caixas",
  saco: "Saco(s)",
  rolo: "Rolo(s)",
};

const DELIVERY_LOCATIONS = [
  { value: "almoxarifado_principal", label: "Almoxarifado Principal" },
  { value: "canteiro_obras", label: "Canteiro de Obras" },
  { value: "escritorio", label: "Escritório" },
];

// Map order units to inventory units
const mapUnitToInventory = (unit: QuantityUnit): string => {
  const unitMap: Record<string, string> = {
    unidade: "unidade",
    par: "par",
    pecas: "peça",
    centimetros: "centímetro",
    metros: "metro",
    metro_quadrado: "m²",
    metro_cubico: "m³",
    quilos: "kg",
    litros: "litro",
    galao: "galão",
    balde: "balde",
    pacotes: "pacote",
    caixas: "caixa",
    saco: "saco",
    rolo: "rolo",
  };
  return unitMap[unit] || "unidade";
};

// Derive category from product name
const deriveCategory = (productName: string): string => {
  const name = productName.toLowerCase();
  
  if (name.includes("epi") || name.includes("luva") || name.includes("capacete") || 
      name.includes("bota") || name.includes("óculos") || name.includes("protetor") ||
      name.includes("colete") || name.includes("cinto")) {
    return "EPI";
  }
  if (name.includes("ferramenta") || name.includes("martelo") || name.includes("chave") ||
      name.includes("alicate") || name.includes("serra") || name.includes("furadeira")) {
    return "Ferramentas";
  }
  if (name.includes("tinta") || name.includes("cimento") || name.includes("areia") ||
      name.includes("brita") || name.includes("tijolo") || name.includes("argamassa")) {
    return "Material de Construção";
  }
  if (name.includes("papel") || name.includes("caneta") || name.includes("pasta") ||
      name.includes("grampo") || name.includes("caderno")) {
    return "Material de Escritório";
  }
  if (name.includes("limpeza") || name.includes("sabão") || name.includes("detergente") ||
      name.includes("vassoura") || name.includes("pano")) {
    return "Material de Limpeza";
  }
  
  return "Geral";
};

interface DeliveryItem {
  productName: string;
  quantity: number;
  unit: string;
  originalUnit: QuantityUnit;
  photoUrls: string[];
}

export function DeliveryConfirmationDialog({
  order,
  orderItems,
  open,
  onOpenChange,
  onConfirm,
}: DeliveryConfirmationDialogProps) {
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createItem = useCreateItem();
  const { toast } = useToast();

  // Initialize items from order
  useEffect(() => {
    if (!open || !order) return;
    
    const newItems: DeliveryItem[] = [];
    
    if (orderItems && orderItems.length > 0) {
      orderItems.forEach((item) => {
        newItems.push({
          productName: item.product_name,
          quantity: item.quantity,
          unit: mapUnitToInventory(item.quantity_unit),
          originalUnit: item.quantity_unit,
          photoUrls: (item as any).photo_urls || [],
        });
      });
    } else {
      newItems.push({
        productName: order.product_name,
        quantity: order.quantity,
        unit: mapUnitToInventory(order.quantity_unit),
        originalUnit: order.quantity_unit,
        photoUrls: order.photo_urls || [],
      });
    }
    
    setItems(newItems);
    setDeliveryLocation("");
  }, [open, order, orderItems]);

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].quantity = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handleConfirm = async () => {
    if (!deliveryLocation) {
      toast({
        title: "Selecione o local de entrega",
        variant: "destructive",
      });
      return;
    }

    if (items.some((item) => item.quantity <= 0)) {
      toast({
        title: "Quantidade inválida",
        description: "Todos os itens devem ter quantidade maior que zero",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      for (const item of items) {
        const category = deriveCategory(item.productName);
        
        await createItem.mutateAsync({
          name: item.productName.toUpperCase(),
          category,
          quantity: item.quantity,
          min_quantity: 0,
          unit: item.unit,
          photo_urls: item.photoUrls,
          notes: `Recebido via pedido #${order?.order_number} - Local: ${
            DELIVERY_LOCATIONS.find((l) => l.value === deliveryLocation)?.label || deliveryLocation
          }`,
        });
      }

      toast({
        title: "Entrega confirmada!",
        description: `${items.length} item(ns) adicionado(s) ao estoque.`,
      });

      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding to inventory:", error);
      toast({
        title: "Erro ao adicionar ao estoque",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Confirmar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Confirme a quantidade recebida e o local de entrega para adicionar ao estoque.
          </div>

          {/* Items */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Itens Entregues
            </Label>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {/* Photo thumbnails */}
                  {item.photoUrls.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {item.photoUrls.slice(0, 2).map((url, i) => (
                        <img loading="lazy" decoding="async"
                          key={i}
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-10 h-10 rounded object-cover border border-border"
                        />
                      ))}
                      {item.photoUrls.length > 2 && (
                        <span className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">
                          +{item.photoUrls.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {UNIT_LABELS[item.originalUnit] || item.unit}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    className="w-24 text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Local de Entrega
            </Label>
            <Select value={deliveryLocation} onValueChange={setDeliveryLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local..." />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_LOCATIONS.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            <Check className="w-4 h-4 mr-2" />
            {isSubmitting ? "Salvando..." : "Confirmar Entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
