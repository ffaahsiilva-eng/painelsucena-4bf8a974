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

        <div className="sucena-module-grid">
          {equipamentosPages.map((page) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="sucena-module-tile group"
            >
              <page.icon className="h-10 w-10 text-[#555b5f] group-hover:text-[#b68a46] group-hover:scale-110 transition-all duration-300" strokeWidth={1.2} />
              <span className="text-[15px] font-semibold text-[#2b2f31]">
                {page.label}
              </span>
            </button>
          ))}
          
          <Link
            to="/status-geral-equipamentos"
            className="sucena-module-tile group"
          >
            <ListChecks className="h-10 w-10 text-[#555b5f] group-hover:text-[#b68a46] group-hover:scale-110 transition-all duration-300" strokeWidth={1.2} />
            <span className="text-[15px] font-semibold text-[#2b2f31]">
              Status Geral
              {equipCount > 0 ? `\n(${equipCount} ${equipCount === 1 ? "Equipamento" : "Equipamentos"})` : ""}
            </span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Equipamentos;
