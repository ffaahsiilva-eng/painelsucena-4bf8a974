import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, Clock, Check, Hourglass, Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrderHighlights, useAcknowledgeOrderHighlight } from "@/hooks/useOrderHighlights";
import { getBrazilNorthDate } from "@/lib/timezone";
import { Link } from "react-router-dom";

export function OrderHighlightBanner() {
  const { data: highlights, isLoading } = useOrderHighlights();
  const acknowledgeHighlight = useAcknowledgeOrderHighlight();

  if (isLoading || !highlights || highlights.length === 0) {
    return null;
  }

  const today = getBrazilNorthDate();

  const handleAction = (orderId: string, action: "ciente" | "aguardando") => {
    acknowledgeHighlight.mutate({ orderId, action });
  };

  return (
    <div className="mb-6 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Package className="w-4 h-4" />
        <span>Seus Pedidos</span>
      </div>

      {highlights.map((order) => {
        const expectedDate = parseISO(order.expected_date!);
        const daysUntil = differenceInDays(expectedDate, today);
        const isDeliveryDay = order.showReason === "delivery_day";

        return (
          <Card
            key={order.id}
            className={`overflow-hidden transition-all glass-card-dashboard ${
              isDeliveryDay
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-amber-500/50 bg-amber-500/5"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`p-2 rounded-lg ${
                    isDeliveryDay ? "bg-primary/20" : "bg-amber-500/20"
                  }`}
                >
                  {isDeliveryDay ? (
                    <Package className="w-5 h-5 text-primary" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold truncate">{order.product_name}</h4>
                    <Badge
                      variant={isDeliveryDay ? "default" : "outline"}
                      className={
                        isDeliveryDay
                          ? "bg-primary"
                          : "border-amber-500 text-amber-600 dark:text-amber-400"
                      }
                    >
                      {isDeliveryDay ? "🎉 Previsão Hoje!" : `${daysUntil} dias restantes`}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Previsão: {format(expectedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span>
                      {order.quantity} {order.quantity_unit}
                    </span>
                  </div>

                  {/* Actions */}
                  {!isDeliveryDay && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handleAction(order.id, "ciente")}
                        disabled={acknowledgeHighlight.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Ciente
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => handleAction(order.id, "aguardando")}
                        disabled={acknowledgeHighlight.isPending}
                      >
                        <Hourglass className="w-3 h-3 mr-1" />
                        Aguardando
                      </Button>
                    </div>
                  )}

                  {isDeliveryDay && (
                    <p className="text-sm text-primary mt-2 font-medium">
                      Sua entrega está prevista para hoje! Acompanhe o status.
                    </p>
                  )}
                </div>

                {/* Link to orders */}
                <Link
                  to="/pedidos"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
