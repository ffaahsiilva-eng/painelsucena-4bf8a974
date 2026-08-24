import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditEntry {
  id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  changed_by_name?: string | null;
}

const fieldLabels: Record<string, string> = {
  status: "Status",
  inspected_at: "Data da inspeção",
  photo_url: "Foto",
};

const statusLabels: Record<string, string> = {
  inspected: "Inspecionada",
  cancelled: "Cancelada",
  pending: "Pendente",
};

function formatValue(field: string | null, value: string | null) {
  if (value === null || value === "") return "—";
  if (field === "status") return statusLabels[value] ?? value;
  if (field === "inspected_at") {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return value;
    }
  }
  if (field === "photo_url") return "Foto anexada";
  return value;
}

function useAuditTrail(inspectionId: string | null) {
  return useQuery({
    queryKey: ["sling-inspection-audit", inspectionId],
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sling_inspection_audit")
        .select("*")
        .eq("inspection_id", inspectionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as AuditEntry[];
      const userIds = Array.from(
        new Set(rows.map((r) => r.changed_by).filter(Boolean) as string[]),
      );
      let nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || ""]));
      }
      return rows.map((r) => ({
        ...r,
        changed_by_name: r.changed_by ? nameMap.get(r.changed_by) ?? null : null,
      }));
    },
  });
}

interface Props {
  inspectionId: string;
  slingTag: string;
}

export function SlingAuditTrailButton({ inspectionId, slingTag }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAuditTrail(open ? inspectionId : null);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1 h-7 px-2"
        onClick={() => setOpen(true)}
        title="Ver histórico de alterações"
      >
        <ClipboardList className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Auditoria — {slingTag}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {data.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border border-border bg-muted/30 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.action === "created" ? "default" : "secondary"}>
                        {entry.action === "created" ? "Criado" : "Atualizado"}
                      </Badge>
                      <span className="text-sm font-medium">
                        {fieldLabels[entry.field ?? ""] ?? entry.field ?? "—"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm">
                    {entry.action === "updated" ? (
                      <span className="text-muted-foreground">
                        <span className="line-through">{formatValue(entry.field, entry.old_value)}</span>
                        {" → "}
                        <span className="text-foreground font-medium">
                          {formatValue(entry.field, entry.new_value)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-foreground">{formatValue(entry.field, entry.new_value)}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Por: {entry.changed_by_name || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
