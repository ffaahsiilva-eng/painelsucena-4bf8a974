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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
          {rdoPages.map((page) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="group relative rounded-2xl p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] focus:outline-none"
              style={{ background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)" }}
            >
              <div
                className="rounded-[14px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 h-full min-h-[140px] md:min-h-[160px]"
                style={{ background: "linear-gradient(160deg, #d4a84c 0%, #c49a3c 25%, #b08830 50%, #c49a3c 75%, #d8b050 100%)" }}
              >
                <div className="absolute inset-[6px] rounded-xl border border-[#b8942e]/50 pointer-events-none" />
                <page.icon className="h-10 w-10 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight whitespace-pre-line">
                  {page.label}
                </span>
              </div>
            </button>
          ))}

          {definitions.map((def) => {
            const Icon = getIconComponent(def.icon);
            return (
              <div
                key={def.id}
                className="group relative rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]"
                style={{ background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)" }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/atividade-custom/${def.id}`)}
                  className="w-full h-full rounded-[14px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 min-h-[140px] md:min-h-[160px] focus:outline-none"
                  style={{ background: "linear-gradient(160deg, #d4a84c 0%, #c49a3c 25%, #b08830 50%, #c49a3c 75%, #d8b050 100%)" }}
                >
                  <div className="absolute inset-[6px] rounded-xl border border-[#b8942e]/50 pointer-events-none" />
                  <Icon className="h-10 w-10 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                  <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight whitespace-pre-line">
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
              className="group relative rounded-2xl p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] focus:outline-none"
              style={{ background: "linear-gradient(145deg, #d4a84c, #b8942e, #e8c95a, #a07828)" }}
              title="Adicionar nova atividade"
            >
              <div
                className="rounded-[14px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 h-full min-h-[140px] md:min-h-[160px] border-2 border-dashed border-[#1a1a1a]/30"
                style={{ background: "linear-gradient(160deg, #e8c95a 0%, #d4a84c 50%, #e8c95a 100%)" }}
              >
                <Plus className="h-10 w-10 md:h-12 md:w-12 text-[#1a1a1a] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                <span className="text-[#1a1a1a] text-xs md:text-sm font-semibold text-center leading-tight">
                  Nova Atividade
                </span>
              </div>
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
