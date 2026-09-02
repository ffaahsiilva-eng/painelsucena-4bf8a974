import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, LogIn, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { ResetSingleEquipment } from "@/components/driver/ResetSingleEquipment";

type ErrorRow = {
  id: string;
  created_at: string;
  action: string;
  driver_id: string | null;
  driver_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  error_message: string | null;
  error_code: string | null;
  is_online: boolean | null;
};

type QueueRow = {
  id: string;
  created_at: string;
  action: string;
  status: string;
  equipment_id: string | null;
  driver_id: string | null;
  is_online: boolean | null;
  error: string | null;
};

type LoginRow = {
  id: string;
  created_at: string;
  email: string | null;
  driver_id: string | null;
  success: boolean;
  duration_ms: number | null;
  error_message: string | null;
  user_agent: string | null;
};

type EquipmentLite = { id: string; name: string; plate: string | null };
type DriverLite = { user_id: string; full_name: string | null };

const fmt = (d: string) => format(new Date(d), "dd/MM HH:mm:ss", { locale: ptBR });
const ALL = "__all__";

export default function AdminDriverDiagnostico() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const isAdmin = role === "admin";

  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [equipments, setEquipments] = useState<EquipmentLite[]>([]);
  const [drivers, setDrivers] = useState<DriverLite[]>([]);
  const [loading, setLoading] = useState(false);

  const [text, setText] = useState("");
  const [driverId, setDriverId] = useState<string>(ALL);
  const [equipmentId, setEquipmentId] = useState<string>(ALL);

  const load = async () => {
    setLoading(true);
    try {
      const [e, q, l, eq, pr] = await Promise.all([
        (supabase as any)
          .from("driver_error_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        (supabase as any)
          .from("driver_action_queue")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        (supabase as any)
          .from("driver_login_audit")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        (supabase as any).from("equipment").select("id, name, plate").order("name"),
        (supabase as any)
          .from("profiles")
          .select("user_id, full_name")
          .order("full_name"),
      ]);
      setErrors((e.data as ErrorRow[]) || []);
      setQueue((q.data as QueueRow[]) || []);
      setLogins((l.data as LoginRow[]) || []);
      setEquipments((eq.data as EquipmentLite[]) || []);
      setDrivers((pr.data as DriverLite[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const eqIndex = useMemo(() => {
    const m = new Map<string, EquipmentLite>();
    equipments.forEach((e) => m.set(e.id, e));
    return m;
  }, [equipments]);

  const driverIndex = useMemo(() => {
    const m = new Map<string, DriverLite>();
    drivers.forEach((d) => m.set(d.user_id, d));
    return m;
  }, [drivers]);

  if (roleLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const selectedDriverName =
    driverId !== ALL ? driverIndex.get(driverId)?.full_name?.toLowerCase() ?? null : null;
  const selectedEquipmentName =
    equipmentId !== ALL ? eqIndex.get(equipmentId)?.name?.toLowerCase() ?? null : null;

  const textMatch = (s: string | null | undefined) =>
    !text || (s || "").toLowerCase().includes(text.toLowerCase());

  const matchesDriverName = (name: string | null) =>
    !selectedDriverName || (name || "").toLowerCase() === selectedDriverName;
  const matchesEquipmentName = (name: string | null) =>
    !selectedEquipmentName || (name || "").toLowerCase() === selectedEquipmentName;

  const fErrors = errors.filter((r) => {
    if (driverId !== ALL && r.driver_id && r.driver_id !== driverId) return false;
    if (driverId !== ALL && !r.driver_id && !matchesDriverName(r.driver_name)) return false;
    if (equipmentId !== ALL && r.equipment_id && r.equipment_id !== equipmentId) return false;
    if (equipmentId !== ALL && !r.equipment_id && !matchesEquipmentName(r.equipment_name))
      return false;
    return (
      textMatch(r.action) ||
      textMatch(r.driver_name) ||
      textMatch(r.equipment_name) ||
      textMatch(r.error_message)
    );
  });

  const fQueue = queue.filter((r) => {
    if (driverId !== ALL && r.driver_id !== driverId) return false;
    if (equipmentId !== ALL && r.equipment_id !== equipmentId) return false;
    const eqName = r.equipment_id ? eqIndex.get(r.equipment_id)?.name ?? null : null;
    const drvName = r.driver_id ? driverIndex.get(r.driver_id)?.full_name ?? null : null;
    return textMatch(r.action) || textMatch(r.status) || textMatch(r.error) || textMatch(eqName) || textMatch(drvName);
  });

  const fLogins = logins.filter((r) => {
    if (driverId !== ALL && r.driver_id !== driverId) return false;
    if (equipmentId !== ALL) return false; // login não tem equipamento
    return textMatch(r.email) || textMatch(r.error_message);
  });

  const failedQueue = queue.filter((r) => r.status === "failed").length;
  const pendingQueue = queue.filter((r) => r.status === "pending").length;
  const failedLogins = logins.filter((r) => !r.success).length;

  const clearFilters = () => {
    setText("");
    setDriverId(ALL);
    setEquipmentId(ALL);
  };

  const filtersActive = text !== "" || driverId !== ALL || equipmentId !== ALL;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico do Motorista</h1>
          <p className="text-sm text-muted-foreground">
            Erros, fila de ações idempotentes e auditoria de login
          </p>
        </div>
        <div className="flex gap-2">
          <ResetSingleEquipment />
          <Button onClick={load} disabled={loading} size="default">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 grid gap-2 md:grid-cols-4">
          <Input
            placeholder="Buscar por ação, erro..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger><SelectValue placeholder="Motorista" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Todos os motoristas</SelectItem>
              {drivers
                .filter((d) => d.full_name)
                .map((d) => (
                  <SelectItem key={d.user_id} value={d.user_id}>
                    {d.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={equipmentId} onValueChange={setEquipmentId}>
            <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Todos os equipamentos</SelectItem>
              {equipments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}{e.plate ? ` (${e.plate})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters} disabled={!filtersActive}>
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{fErrors.length}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{pendingQueue}</div>
              <div className="text-xs text-muted-foreground">Fila pendente</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{failedQueue}</div>
              <div className="text-xs text-muted-foreground">Fila falhou</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <LogIn className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{failedLogins}</div>
              <div className="text-xs text-muted-foreground">Logins falhos</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="w-full">
        <TabsList>
          <TabsTrigger value="errors">Erros ({fErrors.length})</TabsTrigger>
          <TabsTrigger value="queue">Fila de Ações ({fQueue.length})</TabsTrigger>
          <TabsTrigger value="logins">Logins ({fLogins.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <Card>
            <CardHeader><CardTitle className="text-base">Últimos erros do painel do motorista</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Quando</th>
                      <th className="text-left p-2">Ação</th>
                      <th className="text-left p-2">Motorista</th>
                      <th className="text-left p-2">Equipamento</th>
                      <th className="text-left p-2">Erro</th>
                      <th className="text-left p-2">Online</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fErrors.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                        <td className="p-2">{r.driver_name || (r.driver_id ? driverIndex.get(r.driver_id)?.full_name ?? "—" : "—")}</td>
                        <td className="p-2">{r.equipment_name || (r.equipment_id ? eqIndex.get(r.equipment_id)?.name ?? "—" : "—")}</td>
                        <td className="p-2 max-w-md truncate text-red-600" title={r.error_message || ""}>
                          {r.error_message || "—"}
                        </td>
                        <td className="p-2">{r.is_online ? "✅" : "🔌"}</td>
                      </tr>
                    ))}
                    {fErrors.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum erro encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader><CardTitle className="text-base">Fila de ações idempotentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Quando</th>
                      <th className="text-left p-2">Ação</th>
                      <th className="text-left p-2">Motorista</th>
                      <th className="text-left p-2">Equipamento</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Online</th>
                      <th className="text-left p-2">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fQueue.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                        <td className="p-2">{r.driver_id ? driverIndex.get(r.driver_id)?.full_name ?? "—" : "—"}</td>
                        <td className="p-2">{r.equipment_id ? eqIndex.get(r.equipment_id)?.name ?? "—" : "—"}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              r.status === "committed" ? "default" :
                              r.status === "failed" ? "destructive" : "secondary"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-2">{r.is_online ? "✅" : "🔌"}</td>
                        <td className="p-2 max-w-md truncate text-red-600" title={r.error || ""}>{r.error || "—"}</td>
                      </tr>
                    ))}
                    {fQueue.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma ação encontrada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins">
          <Card>
            <CardHeader><CardTitle className="text-base">Auditoria de login</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Quando</th>
                      <th className="text-left p-2">E-mail</th>
                      <th className="text-left p-2">Motorista</th>
                      <th className="text-left p-2">Resultado</th>
                      <th className="text-left p-2">Duração</th>
                      <th className="text-left p-2">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fLogins.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="p-2">{r.email || "—"}</td>
                        <td className="p-2">{r.driver_id ? driverIndex.get(r.driver_id)?.full_name ?? "—" : "—"}</td>
                        <td className="p-2">
                          {r.success ? (
                            <span className="text-green-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> OK
                            </span>
                          ) : (
                            <span className="text-red-600 inline-flex items-center gap-1">
                              <XCircle className="h-4 w-4" /> Falhou
                            </span>
                          )}
                        </td>
                        <td className="p-2">{r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</td>
                        <td className="p-2 max-w-md truncate text-red-600" title={r.error_message || ""}>
                          {r.error_message || "—"}
                        </td>
                      </tr>
                    ))}
                    {fLogins.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum login encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
