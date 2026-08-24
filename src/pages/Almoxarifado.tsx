import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Package, Receipt, ShoppingCart, Warehouse, Sprout, MapPinned, ShieldCheck } from "lucide-react";

const almoxarifadoPages = [
  { label: "Estoque", icon: Package, path: "/estoque" },
  { label: "Notas Fiscais", icon: Receipt, path: "/notas-fiscais" },
  { label: "Pedidos", icon: ShoppingCart, path: "/pedidos" },
  { label: "Requisição", icon: ShieldCheck, path: "/troca-epi" },
  { label: "Adubo", icon: Sprout, path: "/adubo" },
  { label: "Aspersores", icon: MapPinned, path: "/aspersores" },
];

const Almoxarifado = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <Warehouse className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">Almoxarifado</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
          {almoxarifadoPages.map((page) => (
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
                <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight">
                  {page.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Almoxarifado;
