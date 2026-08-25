import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIImproveButtonProps {
  text: string;
  onImproved: (newText: string) => void;
  disabled?: boolean;
}

export function AIImproveButton({ text, onImproved, disabled }: AIImproveButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleImprove = async () => {
    if (!text.trim()) {
      toast.error("Escreva algo primeiro para a IA melhorar.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("improve-activity-text", {
        body: { text },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.improved) {
        onImproved(data.improved);
        toast.success("Texto melhorado pela IA!");
      }
    } catch (err: any) {
      toast.error("Erro ao melhorar texto: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleImprove}
      disabled={disabled || loading || !text.trim()}
      className="gap-1.5 text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      Melhorar com IA
    </Button>
  );
}
