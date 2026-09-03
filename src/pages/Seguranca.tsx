import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import {
  Sun, FolderOpen, ClipboardCheck, BadgeCheck, Link2,
  HardHat, Droplets, TriangleAlert, ShieldCheck, FlameKindling, Shield, Heart, Grid3X3, GraduationCap
} from "lucide-react";

const securityPages = [
  { label: "DDS", icon: Sun, path: "/dds" },
  { label: "Permissão\nde Trabalho", icon: FolderOpen, path: "/documentos" },
  { label: "Homologados", icon: BadgeCheck, path: "/homologados" },
  { label: "Vistoria Cintas", icon: Link2, path: "/vistoria-cintas" },
  { label: "Inspeção\nde Canteiro", icon: HardHat, path: "/inspecao-canteiro" },
  { label: "Pós Chuva", icon: Droplets, path: "/pos-chuva" },
  { label: "Desvios", icon: TriangleAlert, path: "/desvios" },
  { label: "Requisição", icon: ShieldCheck, path: "/troca-epi" },
  { label: "Inspeção\nExtintores", icon: FlameKindling, path: "/inspecao-extintores" },
  { label: "Campanhas", icon: Heart, path: "/campanhas" },
  { label: "Matriz\nResponsabilidade", icon: Grid3X3, path: "/matriz" },
  { label: "Controle de\nTreinamento", icon: GraduationCap, path: "/controle-treinamento" },
];

const Seguranca = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-8 py-6 sm:py-10 max-w-7xl">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a] shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#c9a84c] tracking-tight">Segurança</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8 mx-auto">
          {securityPages.map((page) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="group relative rounded-2xl p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] focus:outline-none"
              style={{
                background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)",
              }}
            >
              {/* Inner card */}
              <div
                className="rounded-[14px] flex flex-col items-center justify-center gap-3 p-4 md:p-6 h-full min-h-[120px] md:min-h-[160px]"
                style={{
                  background: "linear-gradient(160deg, #d4a84c 0%, #c49a3c 25%, #b08830 50%, #c49a3c 75%, #d8b050 100%)",
                }}
              >
                {/* Inner border effect */}
                <div className="absolute inset-[6px] rounded-xl border border-[#b8942e]/50 pointer-events-none" />
                
                <page.icon className="h-8 w-8 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight whitespace-pre-line">
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

export default Seguranca;
