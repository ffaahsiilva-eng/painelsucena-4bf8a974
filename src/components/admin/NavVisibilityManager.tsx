import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import { Skeleton } from "@/components/ui/skeleton";

// All nav items that can be configured
const NAV_ITEMS = [
  { id: "atividades", label: "Atividades I" },
  { id: "atividades-ii", label: "Atividades II" },
  { id: "planejamento", label: "Planejamento" },
  { id: "meio-ambiente", label: "Meio Ambiente" },
  { id: "destaques", label: "Destaques" },
  { id: "campanhas", label: "Campanhas" },
  { id: "dds", label: "DDS" },
  { id: "documentos", label: "Documentos" },
  { id: "entrada-saida", label: "Entrada e Saída" },
  { id: "estoque", label: "Estoque" },
  { id: "lembretes", label: "Lembretes" },
  { id: "parte-diaria", label: "Parte Diária" },
  { id: "presenca", label: "Relatório de Presença" },
  { id: "matriz", label: "Matriz Responsabilidade" },
  { id: "pedidos", label: "Pedidos" },
  { id: "rdo", label: "RDO" },
  { id: "relatorio", label: "Lista de Presença" },
  { id: "rh", label: "RH" },
  { id: "vistorias", label: "Vistorias Equipamentos" },
  { id: "homologados", label: "Homologados" },
  { id: "vistoria-cintas", label: "Vistoria Cintas" },
  { id: "hora-extra", label: "Hora Extra" },
  { id: "arquivos-seguranca", label: "Arquivos Segurança" },
  { id: "consumo-abastecimento", label: "Consumo Abastecimento" },
  
  { id: "slides", label: "Slides IA" },
  { id: "instacena", label: "InstaCena" },
  { id: "inspecao-canteiro", label: "Inspeção de Canteiro" },
  { id: "calendario-hydro", label: "Calendário Hydro" },
  { id: "games", label: "Games" },
  { id: "desvios", label: "Desvios" },
  
  { id: "notas-fiscais", label: "Notas Fiscais" },
  { id: "troca-epi", label: "Troca de EPI" },
  { id: "inspecao-extintores", label: "Inspeção Extintores" },
  { id: "emergencia", label: "Emergência" },
];

// All cargo types
const CARGO_TYPES = [
  { id: "moderador", label: "Moderador" },
  { id: "preposto", label: "Preposto" },
  { id: "encarregado_geral", label: "Encarregado Geral" },
  { id: "encarregado_i", label: "Encarregado I" },
  { id: "encarregado_ii", label: "Encarregado II" },
  { id: "tecnico_seguranca_i", label: "Técnico de Segurança I" },
  { id: "tecnico_seguranca_ii", label: "Técnico de Segurança II" },
  { id: "tecnico_meio_ambiente", label: "Técnico Meio Ambiente" },
  { id: "aux_administrativo", label: "Aux. Administrativo" },
  { id: "aux_almoxarifado", label: "Aux. Almoxarifado" },
  { id: "planejador", label: "Planejador" },
  { id: "engenheiro_civil", label: "Engenheiro Civil" },
  { id: "engenheiro_planejamento", label: "Engenheiro de Planejamento" },
  { id: "tecnico_planejamento", label: "Técnico de Planejamento" },
  { id: "engenheiro_seguranca", label: "Engenheiro de Segurança" },
];

export function NavVisibilityManager() {
  const { rules, isLoading, isHiddenForCargo, upsertRule } = useNavVisibilityRules();
  const [selectedCargo, setSelectedCargo] = useState<string>("preposto");

  const handleToggleVisibility = async (navItemId: string, isCurrentlyHidden: boolean) => {
    try {
      await upsertRule.mutateAsync({
        nav_item_id: navItemId,
        cargo: selectedCargo,
        is_hidden: !isCurrentlyHidden,
      });
      toast.success(
        !isCurrentlyHidden 
          ? `"${NAV_ITEMS.find(n => n.id === navItemId)?.label}" oculto para ${CARGO_TYPES.find(c => c.id === selectedCargo)?.label}`
          : `"${NAV_ITEMS.find(n => n.id === navItemId)?.label}" visível para ${CARGO_TYPES.find(c => c.id === selectedCargo)?.label}`
      );
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Erro ao atualizar visibilidade");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutList className="w-5 h-5" />
          Visibilidade do Menu por Cargo
        </CardTitle>
        <CardDescription>
          Configure quais itens do menu lateral ficarão ocultos ou visíveis para cada cargo.
          Administradores sempre visualizam todos os itens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cargo Selector */}
        <div className="space-y-2">
          <Label>Selecione o Cargo</Label>
          <Select value={selectedCargo} onValueChange={setSelectedCargo}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Selecione um cargo" />
            </SelectTrigger>
            <SelectContent>
              {CARGO_TYPES.map((cargo) => (
                <SelectItem key={cargo.id} value={cargo.id}>
                  {cargo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nav Items List */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Itens do Menu para: <span className="font-semibold text-foreground">{CARGO_TYPES.find(c => c.id === selectedCargo)?.label}</span>
          </Label>
          
          <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
            {NAV_ITEMS.map((item) => {
              const isHidden = isHiddenForCargo(item.id, selectedCargo);
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isHidden 
                      ? "bg-destructive/10 border-destructive/30" 
                      : "bg-card border-border hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isHidden ? (
                      <EyeOff className="h-4 w-4 text-destructive" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`font-medium ${isHidden ? "text-destructive line-through" : ""}`}>
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {isHidden ? "Oculto" : "Visível"}
                    </span>
                    <Switch
                      checked={!isHidden}
                      onCheckedChange={() => handleToggleVisibility(item.id, isHidden)}
                      disabled={upsertRule.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{rules.filter(r => r.cargo === selectedCargo && r.is_hidden).length}</span> itens ocultos para este cargo
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
