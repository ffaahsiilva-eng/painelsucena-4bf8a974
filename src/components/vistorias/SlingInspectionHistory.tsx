import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  colorClasses,
  colorLabels,
  type SlingColor,
  type SlingEquipment,
  type SlingInspection,
} from "@/hooks/useSlingEquipment";
import { SlingAuditTrailButton } from "./SlingAuditTrailButton";

interface HistoryRow extends SlingInspection {
  sling: Pick<SlingEquipment, "tag" | "description" | "color"> | null;
  inspector_name?: string | null;
}

function useSlingInspectionHistory() {
  return useQuery({
    queryKey: ["sling-inspection-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sling_inspections")
        .select("*, sling:sling_equipment(tag, description, color)")
        .order("inspected_at", { ascending: false, nullsFirst: false })
        .order("inspection_date", { ascending: false })
        .limit(200);
      if (error) throw error;

      const inspectorIds = Array.from(
        new Set((data || []).map((r) => r.inspected_by).filter(Boolean) as string[]),
      );

      let profileMap = new Map<string, string>();
      if (inspectorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", inspectorIds);
        profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || ""]));
      }

      return (data as unknown as HistoryRow[]).map((row) => ({
        ...row,
        inspector_name: row.inspected_by ? profileMap.get(row.inspected_by) ?? null : null,
      }));
    },
  });
}

export function SlingInspectionHistory() {
  const { data, isLoading } = useSlingInspectionHistory();
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const rows = useMemo(() => data ?? [], [data]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage],
  );


  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico de Vistoria de Cintas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma vistoria registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspecionada em</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead className="text-right">Auditoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => {
                  const color = (row.sling?.color ?? "red") as SlingColor;
                  const statusBadge =
                    row.status === "inspected" ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Inspecionada</Badge>
                    ) : row.status === "cancelled" ? (
                      <Badge variant="secondary">Cancelada</Badge>
                    ) : (
                      <Badge variant="destructive">Pendente</Badge>
                    );
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${colorClasses[color]}`} />
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            {colorLabels[color]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{row.sling?.tag ?? "—"}</TableCell>
                      <TableCell className="text-sm">{row.sling?.description ?? "—"}</TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.inspected_at
                          ? format(new Date(row.inspected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : format(new Date(row.inspection_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{row.inspector_name ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={row.notes ?? ""}>
                        {row.notes || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {row.photo_url ? (
                          <a href={row.photo_url} target="_blank" rel="noreferrer">
                            <img
                              src={row.photo_url}
                              alt={`Foto ${row.sling?.tag ?? ""}`}
                              className="w-10 h-10 rounded object-cover border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <SlingAuditTrailButton
                          inspectionId={row.id}
                          slingTag={row.sling?.tag ?? "—"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-3 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, rows.length)} de {rows.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
