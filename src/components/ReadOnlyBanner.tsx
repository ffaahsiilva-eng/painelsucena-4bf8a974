import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReadOnlyBannerProps {
  message?: string;
}

export const ReadOnlyBanner = ({ 
  message = "Você está visualizando esta página em modo somente leitura." 
}: ReadOnlyBannerProps) => {
  return (
    <Alert className="mb-4 border-emerald-500/50 bg-emerald-500/10">
      <AlertCircle className="h-4 w-4 text-emerald-500" />
      <AlertDescription className="text-emerald-600 dark:text-emerald-400">
        {message}
      </AlertDescription>
    </Alert>
  );
};
