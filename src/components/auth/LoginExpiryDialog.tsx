import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useDocuments } from "@/hooks/useDocuments";
import { useVehicleInspections, DATE_FIELDS } from "@/hooks/useVehicleInspections";
import { useEnvironment } from "@/hooks/useEnvironment";
import { getEffectiveAsoExpiry, getEffectiveAsoExpiryStr } from "@/lib/asoValidity";
import { parseISO, isValid, format } from "date-fns";

interface ExpiredItem {
  category: "ASO" | "NR" | "Documento" | "Veículo";
  title: string;
  subtitle?: string;
  date: string;
  daysOverdue: number;
}

function parseDateBR(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

const SESSION_KEY = "loginExpiryDialogShown";

export function LoginExpiryDialog() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const isDriver = profile?.cargo === "motorista_pipa" || profile?.cargo === "motorista_munk";

  const { data: rhData } = useRHEfetivo();
  const { data: documents } = useDocuments();
  const { data: vehicles } = useVehicleInspections();
  const { environment } = useEnvironment();

  const [open, setOpen] = useState(false);

  const expiredItems = useMemo<ExpiredItem[]>(() => {
    if (isDriver) return [];
    // Aguarda o usuário selecionar o ambiente — sem ambiente, o RLS bloqueia o
    // rh_efetivo e a hook cai num fallback estático desatualizado, mostrando ASOs
    // "vencidos" que já foram atualizados.
    if (!environment) return [];
    if (!rhData?.hasImported) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: ExpiredItem[] = [];

    // ASOs — usa a validade EFETIVA (considera retorno/periódico/mudança recente + 1 ano
    // ou a validade salva manualmente, o que for mais recente). Só lista quando a data
    // efetiva já passou de fato.
    rhData?.colaboradores?.forEach((c) => {
      const vencDate = getEffectiveAsoExpiry(c.aso, c.admissao);
      const vencStr = getEffectiveAsoExpiryStr(c.aso, c.admissao);
      if (!vencDate || !vencStr) return;
      const vencMidnight = new Date(vencDate);
      vencMidnight.setHours(0, 0, 0, 0);
      if (vencMidnight.getTime() < today.getTime()) {
        const diff = Math.ceil((today.getTime() - vencMidnight.getTime()) / 86400000);
        items.push({ category: "ASO", title: c.nome, date: vencStr, daysOverdue: diff });
      }
    });

    // NRs
    rhData?.colaboradores?.forEach((c) => {
      if (!c.nrDates) return;
      Object.entries(c.nrDates).forEach(([nr, dates]: [string, any]) => {
        if (!dates?.vencimento) return;
        const d = parseDateBR(dates.vencimento);
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        if (d.getTime() < today.getTime()) {
          const diff = Math.ceil((today.getTime() - d.getTime()) / 86400000);
          items.push({ category: "NR", title: c.nome, subtitle: nr, date: dates.vencimento, daysOverdue: diff });
        }
      });
    });

    // Documents
    documents?.forEach((doc: any) => {
      if (doc.status !== "pending") return;
      try {
        const d = parseISO(doc.expiry_date);
        if (!isValid(d)) return;
        d.setHours(0, 0, 0, 0);
        if (d.getTime() < today.getTime()) {
          const diff = Math.ceil((today.getTime() - d.getTime()) / 86400000);
          items.push({
            category: "Documento",
            title: doc.title,
            date: format(d, "dd/MM/yyyy"),
            daysOverdue: diff,
          });
        }
      } catch {/* ignore */}
    });

    // Vehicles
    vehicles?.forEach((v: any) => {
      DATE_FIELDS.forEach((f) => {
        const dateStr = v[f.key];
        if (!dateStr) return;
        try {
          const d = parseISO(dateStr);
          if (!isValid(d)) return;
          d.setHours(0, 0, 0, 0);
          if (d.getTime() < today.getTime()) {
            const diff = Math.ceil((today.getTime() - d.getTime()) / 86400000);
            items.push({
              category: "Veículo",
              title: v.placa,
              subtitle: f.label,
              date: format(d, "dd/MM/yyyy"),
              daysOverdue: diff,
            });
          }
        } catch {/* ignore */}
      });
    });

    return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [rhData, documents, vehicles, isDriver, environment]);

  // Assinatura do conjunto atual — reabrir só quando muda; fechar quando esvazia.
  const signature = useMemo(
    () => expiredItems.map((i) => `${i.category}|${i.title}|${i.subtitle ?? ""}|${i.date}`).join("§"),
    [expiredItems]
  );

  useEffect(() => {
    if (!user?.id || isDriver) return;
    if (!environment) return;
    if (!rhData || !documents || !vehicles) return;

    const flagKey = `${SESSION_KEY}_${user.id}`;
    if (expiredItems.length === 0) {
      setOpen(false);
      sessionStorage.removeItem(flagKey);
      return;
    }
    const lastSig = sessionStorage.getItem(flagKey);
    if (lastSig === signature) return;
    setOpen(true);
    sessionStorage.setItem(flagKey, signature);
  }, [user?.id, isDriver, environment, rhData, documents, vehicles, expiredItems.length, signature]);

  if (!user || isDriver) return null;

  const grouped = expiredItems.reduce<Record<string, ExpiredItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            Itens Vencidos ({expiredItems.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{category}</h4>
                  <Badge variant="destructive">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={`${category}-${idx}`}
                      className="flex items-center justify-between gap-2 p-3 rounded-md border border-red-500/40 bg-red-500/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="destructive" className="mb-1">
                          {item.daysOverdue === 1 ? "1 dia" : `${item.daysOverdue} dias`} vencido
                        </Badge>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
