import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EMOJI_CHART, EMOJI_CALENDAR, EMOJI_CHART_UP, EMOJI_POTABLE_WATER, EMOJI_TRUCK, EMOJI_CLIPBOARD } from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";

interface DailyRecord {
  formattedDate: string;
  vehicleName: string;
  plate: string;
  point: string;
  liters: number;
}

interface RefuelingByPoint {
  point: string;
  count: number;
  liters: number;
}

interface RefuelingByVehicle {
  vehicleName: string;
  count: number;
  liters: number;
}

interface CopyConsumoButtonProps {
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null;
  selectedVehicleName: string;
  dailyRecords: DailyRecord[];
  refuelingByPoint: RefuelingByPoint[];
  refuelingByVehicle: RefuelingByVehicle[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ShareConsumoWhatsappButton({
  selectedMonth,
  selectedYear,
  selectedDay,
  selectedVehicleName,
  dailyRecords,
  refuelingByPoint,
  refuelingByVehicle,
}: CopyConsumoButtonProps) {
  const buildMessage = () => {
    let filterDescription = `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
    if (selectedDay) {
      filterDescription = `${selectedDay} de ${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
    }
    if (selectedVehicleName !== "Todos os Veículos") {
      filterDescription += ` - ${selectedVehicleName}`;
    }

    const totalAbastecimentos = dailyRecords.length;
    const totalLitros = dailyRecords.reduce((acc, r) => acc + r.liters, 0);
    const mediaLitros = totalAbastecimentos > 0 ? Math.round(totalLitros / totalAbastecimentos) : 0;

    let message = `${EMOJI_CHART} *RELATÓRIO DE ABASTECIMENTOS DE ÁGUA*\n`;
    message += `${EMOJI_CALENDAR} Período: ${filterDescription}\n\n`;
    
    message += `${EMOJI_CHART_UP} *RESUMO GERAL*\n`;
    message += `• Total de Abastecimentos: ${totalAbastecimentos}\n`;
    message += `• Volume Total: ${totalLitros.toLocaleString("pt-BR")} L\n`;
    message += `• Média por Abastecimento: ${mediaLitros.toLocaleString("pt-BR")} L\n\n`;

    if (refuelingByPoint.length > 0) {
      message += `${EMOJI_POTABLE_WATER} *ABASTECIMENTOS POR PONTO*\n`;
      refuelingByPoint.forEach(p => {
        message += `• ${p.point}: ${p.count} abast. (${p.liters.toLocaleString("pt-BR")} L)\n`;
      });
      message += `\n`;
    }

    if (refuelingByVehicle.length > 0) {
      message += `${EMOJI_TRUCK} *CONSUMO POR VEÍCULO*\n`;
      refuelingByVehicle.forEach(v => {
        message += `• ${v.vehicleName}: ${v.count} abast. (${v.liters.toLocaleString("pt-BR")} L)\n`;
      });
      message += `\n`;
    }

    const recentRecords = dailyRecords.slice(-10);
    if (recentRecords.length > 0) {
      message += `${EMOJI_CLIPBOARD} *ÚLTIMOS REGISTROS*\n`;
      recentRecords.forEach(r => {
        message += `• ${r.formattedDate} - ${r.vehicleName} @ ${r.point}: ${r.liters.toLocaleString("pt-BR")} L\n`;
      });
      if (dailyRecords.length > 10) {
        message += `... e mais ${dailyRecords.length - 10} registros\n`;
      }
    }

    message += `\n_Sucena Empreendimentos_`;
    return message;
  };

  const handleWhatsApp = async () => {
    if (dailyRecords.length === 0) { toast.error("Nenhum dado para compartilhar"); return; }
    const ok = await copyAndShareWhatsApp(buildMessage());
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopy = async () => {
    if (dailyRecords.length === 0) { toast.error("Nenhum dado para copiar"); return; }
    const ok = await copyToClipboard(buildMessage());
    if (ok) toast.success("Relatório copiado!");
    else toast.error("Erro ao copiar");
  };

  return (
    <>
      <Button
        onClick={handleWhatsApp}
        variant="outline"
        size="icon"
        title="Enviar via WhatsApp"
      >
        <MessageCircle className="h-4 w-4 text-[#25D366]" />
      </Button>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="icon"
        title="Copiar relatório"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </>
  );
}
