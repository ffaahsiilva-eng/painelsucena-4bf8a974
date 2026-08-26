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
      <div className="w-full">
        <div className="mb-10">
          <h1 className="sucena-page-title text-center md:text-left">Almoxarifado</h1>
          <p className="sucena-page-subtitle text-center md:text-left">Gestão de estoque, pedidos e requisições</p>
        </div>

        <div className="sucena-module-grid">
          {almoxarifadoPages.map((page) => (
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

export default Almoxarifado;
