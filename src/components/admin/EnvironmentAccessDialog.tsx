import { useState } from "react";
import { Globe, Building2, TreePine, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { useAllEnvironmentAccess } from "@/hooks/useEnvironmentAccess";
import { toast } from "sonner";

interface Props {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

const ENV_META: Record<EnvironmentId, { icon: typeof Building2; tone: string }> = {
  barcarena: { icon: Building2, tone: "text-sky-600 dark:text-sky-400" },
  paragominas: { icon: TreePine, tone: "text-emerald-600 dark:text-emerald-400" },
};

export function EnvironmentAccessDialog({ userId, userName, trigger, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const { accessMap, grantMutation, revokeMutation } = useAllEnvironmentAccess();
  const userEnvs = (accessMap.get(userId) ?? []) as EnvironmentId[];

  const handleToggle = async (env: EnvironmentId, checked: boolean) => {
    try {
      if (checked) {
        await grantMutation.mutateAsync({ userId, environment: env });
        toast.success(`Acesso a ${ENVIRONMENTS[env].shortLabel} liberado.`);
      } else {
        await revokeMutation.mutateAsync({ userId, environment: env });
        toast.success(`Acesso a ${ENVIRONMENTS[env].shortLabel} removido.`);
      }
    } catch (err: any) {
      toast.error("Erro: " + (err?.message ?? "tente novamente"));
    }
  };

  const isLoading = grantMutation.isPending || revokeMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Acesso por Ambiente
          </DialogTitle>
          <DialogDescription>
            Defina quais ambientes <strong>{userName}</strong> pode acessar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {(Object.keys(ENVIRONMENTS) as EnvironmentId[]).map((id) => {
            const env = ENVIRONMENTS[id];
            const meta = ENV_META[id];
            const Icon = meta.icon;
            const enabled = userEnvs.includes(id);
            const isDefault = id === "barcarena";

            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-md bg-muted ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label htmlFor={`env-${id}`} className="text-sm font-medium cursor-pointer">
                      {env.label}
                    </Label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{env.description}</p>
                      {isDefault && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  id={`env-${id}`}
                  checked={enabled}
                  disabled={isLoading}
                  onCheckedChange={(c) => handleToggle(id, c)}
                />
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center text-xs text-muted-foreground gap-2 pt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t">
          💡 Administradores têm acesso a todos os ambientes automaticamente.
        </p>
      </DialogContent>
    </Dialog>
  );
}
