import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import {
  Sun, FolderOpen, ClipboardCheck, BadgeCheck, Link2,
  HardHat, Droplets, TriangleAlert, ShieldCheck, FlameKindling, Shield, Heart, Grid3X3, GraduationCap, BookOpen
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
  { label: "Data Book\nHydro", icon: BookOpen, path: "/data-book-hydro" },
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

        <div className="sucena-module-grid">
          {securityPages.map((page) => (
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

export default Seguranca;
