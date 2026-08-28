import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EquipmentStatusList } from "@/components/driver/EquipmentStatusList";

export default function EquipamentosMotorista() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95  border-b shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/painel-motorista")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold truncate">Equipamentos</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        <EquipmentStatusList />
      </main>
    </div>
  );
}
