import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Formats a Brazilian phone number as the user types: (DD) 9XXXX-XXXX.
 * Strips non-digits and caps at 11 digits.
 */
export function formatBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidBR(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  // 10 (fixo) ou 11 (celular com 9). Aceita ambos, mas força DDD válido.
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  // Se tem 11 dígitos, o terceiro deve ser 9 (celular)
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/**
 * Global modal that forces every logged-in user to register a WhatsApp number
 * before continuing. Cannot be dismissed until a valid number is saved.
 * Drivers (motorista_pipa/munk) are exempt to keep the field-app simple.
 */
export function WhatsAppGate() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const needsNumber = useMemo(() => {
    if (!user || isLoading || !profile) return false;
    // Drivers exempt
    if (profile.cargo === "motorista_pipa" || profile.cargo === "motorista_munk") return false;
    const current = (profile as any).whatsapp_number as string | null | undefined;
    return !current || current.trim().length < 10;
  }, [user, profile, isLoading]);

  // Reset input when modal opens
  useEffect(() => {
    if (needsNumber) setValue("");
  }, [needsNumber]);

  const handleSave = async () => {
    if (!user) return;
    if (!isValidBR(value)) {
      toast.error("Informe um número de WhatsApp válido com DDD (ex: (91) 98888-7777)");
      return;
    }
    setSaving(true);
    try {
      const digits = value.replace(/\D/g, "");
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_number: digits })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("WhatsApp cadastrado com sucesso!");
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar o número. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!needsNumber) return null;

  return (
    <Dialog open modal>
      {/* onOpenChange omitted on purpose — modal must NOT be dismissable */}
      <DialogContent
        className="sm:max-w-md [&>button.absolute]:hidden"
        // Block all dismiss attempts
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Cadastre seu WhatsApp</DialogTitle>
          <DialogDescription className="text-center">
            Para liberar o acesso e novas funcionalidades que estão chegando ao sistema,
            por favor informe o seu número de WhatsApp <strong>com DDD</strong>. Esse cadastro é obrigatório
            e ficará salvo no seu perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Label htmlFor="whatsapp-input" className="text-sm">
            Número do WhatsApp
          </Label>
          <Input
            id="whatsapp-input"
            inputMode="tel"
            placeholder="(91) 98888-7777"
            value={value}
            onChange={(e) => setValue(formatBR(e.target.value))}
            disabled={saving}
            autoFocus
            className="text-lg tracking-wide"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Use apenas números reais que você utiliza no WhatsApp. O número correto é essencial para
            receber as próximas funcionalidades do sistema.
          </p>

          <Button
            onClick={handleSave}
            disabled={saving || !isValidBR(value)}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar e continuar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
