import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { ArrowLeftRight, Truck, Settings, ListChecks, ClipboardCheck } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";

const equipamentosPages = [
  { label: "Entrada\ne Saída", icon: ArrowLeftRight, path: "/entrada-saida-equipamentos" },
  { label: "Parte\nDiária", icon: Truck, path: "/parte-diaria" },
  { label: "Todos os\nEquipamentos", icon: ListChecks, path: "/todos-equipamentos" },
  { label: "Vistoria de\nEquipamentos", icon: ClipboardCheck, path: "/vistorias-equipamentos" },
];

const Equipamentos = () => {
  const navigate = useNavigate();
  const { data: equipment = [] } = useEquipment({ includeDesmobilized: true });
  const equipCount = equipment.length;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <Settings className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">Equipamentos</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 md:gap-5 max-w-2xl mx-auto">
          {equipamentosPages.map((page) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="group relative rounded-2xl p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] focus:outline-none"
              style={{
                background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)",
              }}
            >
              <div
                className="rounded-[14px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 h-full min-h-[140px] md:min-h-[160px]"
                style={{
                  background: "linear-gradient(160deg, #d4a84c 0%, #c49a3c 25%, #b08830 50%, #c49a3c 75%, #d8b050 100%)",
                }}
              >
                <div className="absolute inset-[6px] rounded-xl border border-[#b8942e]/50 pointer-events-none" />
                <page.icon className="h-10 w-10 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight whitespace-pre-line">
                  {page.label}
                </span>
              </div>
            </button>
          ))}
          
          <Link
            to="/status-geral-equipamentos"
            className="group relative rounded-2xl p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]"
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)",
              }}
            />
            <div
              className="relative rounded-[14px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 h-full min-h-[140px] md:min-h-[160px] w-full"
              style={{
                background: "linear-gradient(160deg, #d4a84c 0%, #c49a3c 25%, #b08830 50%, #c49a3c 75%, #d8b050 100%)",
              }}
            >
              <div className="absolute inset-[6px] rounded-xl border border-[#b8942e]/50 pointer-events-none" />
              <ListChecks className="h-10 w-10 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
              <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight whitespace-pre-line">
                Status Geral
                {equipCount > 0 ? `\n(${equipCount} ${equipCount === 1 ? "Equipamento" : "Equipamentos"})` : ""}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Equipamentos;
