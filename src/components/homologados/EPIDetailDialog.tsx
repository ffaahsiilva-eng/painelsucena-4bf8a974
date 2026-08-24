import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HardHat, Shield, FileText, Building2, Hash } from "lucide-react";
import { type EPIHomologado } from "@/data/episHomologados";

interface EPIDetailDialogProps {
  epi: EPIHomologado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EPIDetailDialog({ epi, open, onOpenChange }: EPIDetailDialogProps) {
  if (!epi) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HardHat className="h-6 w-6 text-primary" />
            {epi.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Photo from catalog */}
          {epi.foto && (
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img loading="lazy" decoding="async"
                src={epi.foto}
                alt={`Página do catálogo - ${epi.nome}`}
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
          )}

          {/* Header Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 font-mono">
              <Hash className="h-3 w-3" />
              {epi.ca}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {epi.categoria}
            </Badge>
            {epi.contratadas ? (
              <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Building2 className="h-3 w-3" />
                Contratadas
              </Badge>
            ) : (
              <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                <HardHat className="h-3 w-3" />
                Hydro
              </Badge>
            )}
          </div>

          <Separator />

          {/* Protection Description */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Descrição de Proteção</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {epi.descricaoProtecao}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Certificado de Aprovação</h4>
                <p className="font-mono text-lg font-semibold">{epi.ca}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Disponível para</h4>
                <p className="text-lg font-semibold">
                  {epi.contratadas ? "Empresas Contratadas" : "Hydro Alunorte"}
                </p>
              </CardContent>
            </Card>
          </div>

          {epi.contratadas && (
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Nota:</strong> Este EPI não possui código de compra pelo almoxarifado Hydro Alunorte. 
                Disponível apenas para empresas contratadas.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
