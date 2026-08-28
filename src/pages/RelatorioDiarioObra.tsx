import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { FileText, Leaf, Hammer, Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useCustomActivities } from "@/hooks/useCustomActivities";
import { useEnvironment } from "@/hooks/useEnvironment";
import { ActivityBuilderDialog } from "@/components/rdo-custom/ActivityBuilderDialog";
import { getIconComponent } from "@/lib/customActivity";
import { toast } from "sonner";

const baseRdoPages = [
  { label: "RDO", icon: FileText, path: "/rdo" },
  { label: "Atividade\nJardinagem", icon: Leaf, path: "/atividades", onlyEnv: "barcarena" as const },
  { label: "Atividade\nGabião", icon: Hammer, path: "/atividades-ii", onlyEnv: "barcarena" as const },
  { label: "Atividade\nPrevista", icon: Clock, path: "/atividade-prevista" },
];


const RelatorioDiarioObra = () => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const canCreate =
    isAdmin ||
    profile?.cargo === "preposto" ||
    profile?.cargo === "encarregado_geral" ||
    profile?.cargo === "encarregado_i" ||
    profile?.cargo === "encarregado_ii";

  const { definitions, create, remove } = useCustomActivities();
  const { environment } = useEnvironment();
  const rdoPages = baseRdoPages.filter((p) => !p.onlyEnv || p.onlyEnv === (environment || "barcarena"));
  const [open, setOpen] = useState(false);


  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remover "${title}"?\n\nOs dados registrados também serão apagados.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Atividade removida");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">Relatório Diário Obra</h1>
        </div>

        <div className="sucena-module-grid">
          {rdoPages.map((page) => (
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

          {definitions.map((def) => {
            const Icon = getIconComponent(def.icon);
            return (
              <div key={def.id} className="relative group">
                <button
                  type="button"
                  onClick={() => navigate(`/atividade-custom/${def.id}`)}
                  className="sucena-module-tile group w-full h-full"
                >
                  <Icon className="h-10 w-10 text-[#555b5f] group-hover:text-[#b68a46] group-hover:scale-110 transition-all duration-300" strokeWidth={1.2} />
                  <span className="text-[15px] font-semibold text-[#2b2f31]">
                    {def.title}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(def.id, def.title); }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-red-600/80 text-white transition-colors"
                    title="Remover atividade"
                    aria-label="Remover atividade"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {canCreate && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="sucena-module-tile group border-2 border-dashed border-[#b68a46]/30 bg-transparent hover:bg-white/10"
              title="Adicionar nova atividade"
            >
              <Plus className="h-10 w-10 text-[#555b5f] group-hover:text-[#b68a46] group-hover:scale-110 transition-all duration-300" strokeWidth={1.2} />
              <span className="text-[15px] font-semibold text-[#2b2f31]">
                Nova Atividade
              </span>
            </button>
          )}
        </div>
      </div>

      <ActivityBuilderDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (data) => {
          const created = await create.mutateAsync(data);
          toast.success("Atividade criada");
          navigate(`/atividade-custom/${created.id}`);
        }}
      />
    </Layout>
  );
};

export default RelatorioDiarioObra;
