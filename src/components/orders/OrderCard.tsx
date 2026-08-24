import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, Calendar, User, Clock, ChevronRight, Hash, Forward } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@/hooks/useOrders";
import { formatCargoLabel } from "@/lib/cargoUtils";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  solicitado: { label: "Solicitado", variant: "outline" },
  em_analise: { label: "Em Análise", variant: "outline" },
  aprovado: { label: "Aprovado", variant: "secondary" },
  comprado: { label: "Comprado", variant: "default" },
  a_caminho: { label: "A Caminho", variant: "default" },
  entregue: { label: "Entregue", variant: "secondary" },
  pedido_realizado: { label: "Pedido Realizado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  recusado: { label: "Recusado", variant: "destructive" },
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "un",
  centimetros: "cm",
  metros: "m",
  metro_quadrado: "m²",
  metro_cubico: "m³",
  quilos: "kg",
  litros: "L",
  galao: "gal",
  balde: "bld",
  pacotes: "pct",
  caixas: "cx",
  saco: "saco",
  rolo: "rolo",
  pecas: "pç",
  par: "par",
};

export function OrderCard({ order, onClick }: OrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const unitLabel = UNIT_LABELS[order.quantity_unit] || order.quantity_unit;
  const mainImage = order.photo_urls?.[0] || order.ai_generated_image_url;
  const isCancelled = order.status === "cancelado";

  return (
    <Card 
      className={`hover:bg-accent/50 cursor-pointer transition-colors ${isCancelled ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
            {mainImage ? (
              <img loading="lazy" decoding="async" src={mainImage} alt={order.product_name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-0.5">
                    <Hash className="w-3 h-3" />
                    {order.order_number}
                  </span>
                </div>
                <h3 className={`font-semibold truncate ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                  {order.product_name}
                </h3>
                <p className={`text-sm ${isCancelled ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                  {order.quantity} {unitLabel}
                </p>
              </div>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {order.requester_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(order.created_at), "dd/MM/yy", { locale: ptBR })}
              </span>
              {order.expected_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Prev: {format(new Date(`${order.expected_date}T00:00:00`), "dd/MM", { locale: ptBR })}
                </span>
              )}
              {(order.mentioned_user_name || order.mentioned_cargo) && (
                <span className="flex items-center gap-1 text-primary">
                  <Forward className="w-3 h-3" />
                  {order.mentioned_user_name 
                    ? order.mentioned_user_name 
                    : order.mentioned_cargo 
                      ? formatCargoLabel(order.mentioned_cargo) 
                      : null}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
        </div>
      </CardContent>
    </Card>
  );
}
