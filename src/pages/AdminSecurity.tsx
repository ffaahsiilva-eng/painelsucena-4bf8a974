import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

interface AuthAttempt {
  id: string;
  email: string | null;
  success: boolean;
  failure_reason: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminSecurity() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [attempts, setAttempts] = useState<AuthAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("auth_attempts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setAttempts((data as any) ?? []);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (roleLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  // Aggregate suspicious: 5+ failures from same email in last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const failureCounts = new Map<string, number>();
  attempts.forEach((a) => {
    if (!a.success && a.email && new Date(a.created_at).getTime() > oneHourAgo) {
      failureCounts.set(a.email, (failureCounts.get(a.email) ?? 0) + 1);
    }
  });
  const suspicious = Array.from(failureCounts.entries()).filter(([, n]) => n >= 5);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Segurança · Tentativas de Acesso</h1>
          <p className="text-sm text-muted-foreground">
            Últimas 200 tentativas de login (sucesso e falha).
          </p>
        </div>
      </div>

      {suspicious.length > 0 && (
        <Card className="p-4 border-destructive bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold">Atividade suspeita (última hora)</h2>
          </div>
          <ul className="text-sm space-y-1">
            {suspicious.map(([email, n]) => (
              <li key={email}>
                <strong>{email}</strong> — {n} falhas
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Carregando…</div>
        ) : attempts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Nenhuma tentativa registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">Motivo</th>
                  <th className="text-left p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">
                      {a.success ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <ShieldCheck className="h-3 w-3 mr-1" /> OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ShieldAlert className="h-3 w-3 mr-1" /> Falha
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{a.email ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {a.failure_reason ?? "—"}
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
