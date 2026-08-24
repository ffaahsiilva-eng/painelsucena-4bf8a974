import { AlertTriangle, Car, Calendar } from "lucide-react";
import { format, parseISO, isValid, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVehicleInspections, DATE_FIELDS } from "@/hooks/useVehicleInspections";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ExpiryItem {
  vehicleId: string;
  placa: string;
  modelo: string;
  fieldLabel: string;
  date: string;
}

export function VehicleExpiryBanner() {
  const { data: vehicles, isLoading } = useVehicleInspections();

  if (isLoading || !vehicles) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningDate = addDays(today, 15);

  // Collect all expired and expiring items across all date fields
  const expiredItems: ExpiryItem[] = [];
  const expiringItems: ExpiryItem[] = [];

  vehicles.forEach((vehicle) => {
    DATE_FIELDS.forEach((field) => {
      const dateStr = vehicle[field.key];
      if (!dateStr) return;

      try {
        const date = parseISO(dateStr);
        if (!isValid(date)) return;

        const item: ExpiryItem = {
          vehicleId: vehicle.id,
          placa: vehicle.placa,
          modelo: vehicle.modelo_veiculo,
          fieldLabel: field.label,
          date: dateStr,
        };

        if (isBefore(date, today)) {
          expiredItems.push(item);
        } else if (isBefore(date, warningDate)) {
          expiringItems.push(item);
        }
      } catch {
        // Skip invalid dates
      }
    });
  });

  if (expiredItems.length === 0 && expiringItems.length === 0) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getDaysText = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "";
      const days = differenceInDays(date, today);
      if (days < 0) return `(vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""})`;
      if (days === 0) return "(vence hoje)";
      return `(em ${days} dia${days !== 1 ? "s" : ""})`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      {/* Expired Items */}
      {expiredItems.length > 0 && (
        <div className="expiry-neon-card rounded-xl p-4 glass-card-dashboard">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Documentos Vencidos ({expiredItems.length})
                </h3>
                <Link to="/vistorias-equipamentos">
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    Ver todos
                  </Button>
                </Link>
              </div>
              <div className="space-y-1.5">
                {expiredItems.slice(0, 5).map((item, idx) => (
                  <div
                    key={`${item.vehicleId}-${item.fieldLabel}-${idx}`}
                    className="flex items-center gap-2 text-sm text-foreground font-bold"
                  >
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono font-medium">{item.placa}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate text-xs bg-red-500/20 px-1.5 py-0.5 rounded">{item.fieldLabel}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="whitespace-nowrap">
                      {formatDate(item.date)} {getDaysText(item.date)}
                    </span>
                  </div>
                ))}
                {expiredItems.length > 5 && (
                  <p className="text-xs text-red-400/70 mt-2">
                    +{expiredItems.length - 5} documento(s) vencido(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon Items */}
      {expiringItems.length > 0 && (
        <div className="expiry-neon-card rounded-xl p-4 glass-card-dashboard">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <AlertTriangle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Vencendo em breve ({expiringItems.length})
                </h3>
                <Link to="/vistorias-equipamentos">
                  <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                    Ver todos
                  </Button>
                </Link>
              </div>
              <div className="space-y-1.5">
                {expiringItems.slice(0, 5).map((item, idx) => (
                  <div
                    key={`${item.vehicleId}-${item.fieldLabel}-${idx}`}
                    className="flex items-center gap-2 text-sm text-foreground font-bold"
                  >
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono font-medium">{item.placa}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded">{item.fieldLabel}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="whitespace-nowrap">
                      {formatDate(item.date)} {getDaysText(item.date)}
                    </span>
                  </div>
                ))}
                {expiringItems.length > 5 && (
                  <p className="text-xs text-emerald-400/70 mt-2">
                    +{expiringItems.length - 5} documento(s) vencendo
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
