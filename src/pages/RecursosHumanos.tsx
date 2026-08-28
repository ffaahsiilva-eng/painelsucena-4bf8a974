import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Users, ClipboardList, FileBarChart, CalendarDays } from "lucide-react";

const rhPages = [
  { label: "Efetivo", icon: Users, path: "/rh" },
  { label: "Relatório\nde Presença", icon: ClipboardList, path: "/relatorio-presenca" },
  { label: "Lista de\nPresença", icon: FileBarChart, path: "/presenca" },
  { label: "Calendário\nHydro", icon: CalendarDays, path: "/calendario-hydro" },
];

const RecursosHumanos = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">Efetivo</h1>
        </div>

        <div className="sucena-module-grid">
          {rhPages.map((page) => (
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
        </div>
      </div>
    </Layout>
  );
};

export default RecursosHumanos;
