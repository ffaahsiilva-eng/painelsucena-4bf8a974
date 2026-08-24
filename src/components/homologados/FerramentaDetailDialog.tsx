import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, CheckCircle, Wrench, ListChecks, HardHat } from "lucide-react";
import type { FerramentaHomologada } from "@/data/ferramentasHomologadas";

interface FerramentaDetailDialogProps {
  ferramenta: FerramentaHomologada | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FerramentaDetailDialog({ ferramenta, open, onOpenChange }: FerramentaDetailDialogProps) {
  if (!ferramenta) return null;

  const getRiskBadge = (nivel: string) => {
    switch (nivel) {
      case "Alto":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Alto</Badge>;
      case "Moderado":
        return <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20"><Shield className="h-3 w-3" />Moderado</Badge>;
      default:
        return <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3" />Controlado</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-primary" />
            {ferramenta.nome}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Photo */}
            {ferramenta.foto && (
              <div className="rounded-lg overflow-hidden border">
                <img loading="lazy" decoding="async"
                  src={ferramenta.foto}
                  alt={ferramenta.nome}
                  className="w-full h-auto object-contain max-h-[400px] bg-white"
                />
              </div>
            )}

            {/* Header Info */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{ferramenta.categoria}</Badge>
              {getRiskBadge(ferramenta.nivelRisco)}
            </div>

            {/* Características */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Características Técnicas</h4>
              <p className="text-sm">{ferramenta.caracteristicas}</p>
            </div>

            <Separator />

            {/* Riscos */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Principais Riscos
              </h4>
              <ul className="space-y-1.5">
                {ferramenta.riscos.map((risco, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    {risco}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Medidas Preventivas */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-500" />
                Medidas Preventivas
              </h4>
              <ul className="space-y-1.5">
                {ferramenta.medidasPreventivas.map((medida, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    {medida}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* EPIs */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <HardHat className="h-4 w-4 text-blue-500" />
                EPIs Obrigatórios
              </h4>
              <div className="flex flex-wrap gap-2">
                {ferramenta.epis.map((epi, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {epi}
                  </Badge>
                ))}
              </div>
            </div>

            {/* CAs */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Certificados de Aprovação</h4>
              <div className="flex flex-wrap gap-2">
                {ferramenta.cas.map((ca, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {ca}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
