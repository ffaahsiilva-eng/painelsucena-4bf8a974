import { useState, useMemo } from "react";
import { Globe, Search, Building2, TreePine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllEnvironmentAccess } from "@/hooks/useEnvironmentAccess";
import { ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { EnvironmentAccessDialog } from "./EnvironmentAccessDialog";

export function EnvironmentAccessManager() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const { accessMap } = useAllEnvironmentAccess();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["env-access-users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((u) => (u.full_name ?? "").toLowerCase().includes(term));
  }, [users, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Acesso por Ambiente
        </CardTitle>
        <CardDescription>
          Por padrão, todos os usuários acessam apenas <strong>Barcarena - Alunorte</strong>. Libere
          aqui o acesso a outros ambientes (ex: Paragominas).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando usuários...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado.</p>
          ) : (
            filtered.map((u) => {
              const envs = (accessMap.get(u.user_id) ?? []) as EnvironmentId[];
              const hasBarcarena = envs.includes("barcarena");
              const hasParagominas = envs.includes("paragominas");
              return (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.full_name || "Sem nome"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {hasBarcarena && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Building2 className="w-3 h-3" /> {ENVIRONMENTS.barcarena.shortLabel}
                        </Badge>
                      )}
                      {hasParagominas && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                        >
                          <TreePine className="w-3 h-3" /> {ENVIRONMENTS.paragominas.shortLabel}
                        </Badge>
                      )}
                      {!hasBarcarena && !hasParagominas && (
                        <Badge variant="destructive" className="text-xs">Sem acesso</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSelected({ id: u.user_id, name: u.full_name || "Usuário" })}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Gerenciar
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {selected && (
          <EnvironmentAccessDialog
            userId={selected.id}
            userName={selected.name}
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
