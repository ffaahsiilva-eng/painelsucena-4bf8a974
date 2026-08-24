import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { useSessionPreferences } from "@/hooks/useSessionPreferences";

export const SessionDurationSetting = () => {
  const { sessionDurationHours, updateSessionDuration, isLoading, SESSION_DURATION_OPTIONS } = useSessionPreferences();
  const [selectedDuration, setSelectedDuration] = useState<string>(sessionDurationHours.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const hours = parseInt(selectedDuration, 10);
    if (isNaN(hours)) return;

    setIsSaving(true);
    const success = await updateSessionDuration(hours);
    setIsSaving(false);

    if (success) {
      toast.success("Tempo de sessão atualizado com sucesso!");
    } else {
      toast.error("Erro ao atualizar tempo de sessão");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tempo de Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tempo de Sessão
        </CardTitle>
        <CardDescription>
          Defina quanto tempo você permanece logado antes de ser desconectado automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-duration">Duração da Sessão</Label>
          <Select
            value={selectedDuration}
            onValueChange={setSelectedDuration}
          >
            <SelectTrigger id="session-duration" className="w-full">
              <SelectValue placeholder="Selecione a duração" />
            </SelectTrigger>
            <SelectContent>
              {SESSION_DURATION_OPTIONS.map((hours) => (
                <SelectItem key={hours} value={hours.toString()}>
                  {hours} {hours === 1 ? "hora" : "horas"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Após este período, você será desconectado automaticamente por segurança.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || selectedDuration === sessionDurationHours.toString()}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvar Preferência
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
