import { useState, useEffect, useMemo } from "react";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import {
  ChevronRight,
  Folder,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Loader2,
  ClipboardList,
  ExternalLink,
  Lock,
  Save,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMatrixProgress } from "@/hooks/useMatrixProgress";
import { useMatrixCustomTasks } from "@/hooks/useMatrixCustomTasks";
import { useMatrixHiddenTasks } from "@/hooks/useMatrixHiddenTasks";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";

import parchmentBg from "@/assets/matriz/parchment-bg.jpg";
import iconPreposto from "@/assets/matriz/icon-preposto.png";
import iconEncGeral from "@/assets/matriz/icon-encarregado-geral.png";
import iconEncI from "@/assets/matriz/icon-encarregado-i.png";
import iconEncII from "@/assets/matriz/icon-encarregado-ii.png";
import iconTecSegI from "@/assets/matriz/icon-tec-seg-i.png";
import iconTecSegII from "@/assets/matriz/icon-tec-seg-ii.png";

interface CargoTarefa {
  id: string;
  nome: string;
}

interface CargoFolder {
  id: string;
  cargo: string;
  cargoType: string;
  tarefas: CargoTarefa[];
  borderColor: string;
  accentColor: string;
  iconSrc: string;
}

const cargoFolders: CargoFolder[] = [
  {
    id: "preposto",
    cargo: "Preposto",
    cargoType: "preposto",
    borderColor: "border-blue-400",
    accentColor: "blue",
    iconSrc: iconPreposto,
    tarefas: [
      { id: "p1", nome: "DDS de Liderança" },
      { id: "p2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "p3", nome: "Observação de Tarefas" },
      { id: "p4", nome: "Inspeção em HSE" },
      { id: "p5", nome: "Roda de Conversa" },
    ],
  },
  {
    id: "encarregado-geral",
    cargo: "Encarregado Geral",
    cargoType: "encarregado_geral",
    borderColor: "border-purple-400",
    accentColor: "purple",
    iconSrc: iconEncGeral,
    tarefas: [
      { id: "eg1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "eg2", nome: "Observação de Tarefa" },
      { id: "eg3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-i",
    cargo: "Encarregado I",
    cargoType: "encarregado_i",
    borderColor: "border-orange-400",
    accentColor: "orange",
    iconSrc: iconEncI,
    tarefas: [
      { id: "e1-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e1-2", nome: "Observação de Tarefa" },
      { id: "e1-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-ii",
    cargo: "Encarregado II",
    cargoType: "encarregado_ii",
    borderColor: "border-green-400",
    accentColor: "green",
    iconSrc: iconEncII,
    tarefas: [
      { id: "e2-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e2-2", nome: "Observação de Tarefa" },
      { id: "e2-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "tecnico-seguranca-i",
    cargo: "Téc. Segurança I",
    cargoType: "tecnico_seguranca_i",
    borderColor: "border-red-400",
    accentColor: "red",
    iconSrc: iconTecSegI,
    tarefas: [
      { id: "ts1-1", nome: "DDS da Liderança" },
      { id: "ts1-2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "ts1-3", nome: "Inspeção de HSE" },
      { id: "ts1-4", nome: "Evento sem Lesão / Condição de Risco (ALTO RISCO)" },
      { id: "ts1-5", nome: "Coach em HSE" },
      { id: "ts1-6", nome: "Observação de Tarefa" },
    ],
  },
  {
    id: "tecnico-seguranca-ii",
    cargo: "Téc. Segurança II",
    cargoType: "tecnico_seguranca_ii",
    borderColor: "border-rose-400",
    accentColor: "rose",
    iconSrc: iconTecSegII,
    tarefas: [
      { id: "ts2-1", nome: "DDS da Liderança" },
      { id: "ts2-2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "ts2-3", nome: "Inspeção de HSE" },
      { id: "ts2-4", nome: "Evento sem Lesão / Condição de Risco (ALTO RISCO)" },
      { id: "ts2-5", nome: "Coach em HSE" },
      { id: "ts2-6", nome: "Observação de Tarefa" },
    ],
  },
];

const Matriz = () => {
  const [selectedFolder, setSelectedFolder] = useState<CargoFolder | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const { completedTasks, isLoading, toggleTask, isCompleted } = useMatrixProgress();
  const { tasks: customTasks, addTask, removeTask } = useMatrixCustomTasks();
  const { hiddenIds, hideTask } = useMatrixHiddenTasks();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isStrictAdmin, isLoading: adminLoading } = useIsAdmin();
  const canManageMatrixTasks = isStrictAdmin;

  const foldersWithCustom = useMemo<CargoFolder[]>(() => {
    const hidden = new Set(hiddenIds);
    return cargoFolders.map((f) => ({
      ...f,
      tarefas: [
        ...f.tarefas.filter((t) => !hidden.has(t.id)),
        ...customTasks
          .filter((ct) => ct.cargo_id === f.id)
          .map((ct) => ({ id: ct.id, nome: ct.name, __custom: true } as CargoTarefa & { __custom?: boolean })),
      ],
    }));
  }, [customTasks, hiddenIds]);

  const currentFolder = selectedFolder
    ? foldersWithCustom.find((f) => f.id === selectedFolder.id) || selectedFolder
    : null;

  const canEditFolder = (folder: CargoFolder) => {
    if (canManageMatrixTasks) return true;
    return profile?.cargo === folder.cargoType;
  };

  const handleToggleTask = (taskId: string, folder: CargoFolder) => {
    if (!canEditFolder(folder)) {
      toast.error("Você só pode concluir tarefas do seu cargo.");
      return;
    }
    toggleTask(taskId);
  };

  const handleAddCustomTask = async () => {
    if (!currentFolder || !newTaskName.trim()) return;
    try {
      await addTask(currentFolder.id, newTaskName);
      toast.success("Atividade adicionada!");
      setNewTaskName("");
      setAddOpen(false);
    } catch (e: any) {
      toast.error("Erro ao adicionar: " + (e?.message || ""));
    }
  };

  const handleRemoveCustomTask = async (id: string) => {
    try {
      await removeTask(id);
      toast.success("Atividade removida.");
    } catch (e: any) {
      toast.error("Erro ao remover: " + (e?.message || ""));
    }
  };

  const handleHideDefaultTask = async (id: string) => {
    if (!confirm("Excluir esta atividade padrão? Ela será removida para todos.")) return;
    try {
      await hideTask(id);
      toast.success("Atividade removida.");
    } catch (e: any) {
      toast.error("Erro ao remover: " + (e?.message || ""));
    }
  };

  const getProgress = (folder: CargoFolder) => {
    if (folder.tarefas.length === 0) return 0;
    const completed = folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
    return Math.round((completed / folder.tarefas.length) * 100);
  };

  const getCompletedCount = (folder: CargoFolder) => {
    return folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
  };

  useEffect(() => {
    if (currentFolder && !isLoading) {
      const currentProgress = getProgress(currentFolder);
      if (currentProgress === 100) {
        setShowCelebration(true);
      }
    }
  }, [currentFolder, completedTasks, isLoading]);

  if (isLoading || profileLoading || adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Detail View
  if (currentFolder) {
    const folder = currentFolder;
    const progress = getProgress(folder);
    const completedCount = getCompletedCount(folder);
    const canEdit = canEditFolder(folder);

    return (
      <Layout>
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          cargoName={folder.cargo}
          userName={profile?.name}
          userAvatarUrl={profile?.avatar_url}
        />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova atividade para {folder.cargo}</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Ex.: Reunião de Segurança"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomTask()}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddCustomTask} disabled={!newTaskName.trim()}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="min-h-screen">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
            <Button
              variant="ghost"
              className="mb-4 sm:mb-6 gap-2 text-foreground hover:bg-white/10"
              onClick={() => setSelectedFolder(null)}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center shrink-0 shadow-md">
                <img loading="lazy" decoding="async" src={folder.iconSrc} alt={folder.cargo} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-xl sm:text-3xl font-bold text-foreground">{folder.cargo}</h1>
                  {!canEdit && (
                    <Badge variant="outline" className="text-amber-300 border-amber-500/50 gap-1 text-xs bg-amber-500/10">
                      <Lock className="w-3 h-3" />
                      Somente leitura
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {completedCount}/{folder.tarefas.length} atividades
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <a
                    href="https://forms.office.com/Pages/ResponsePage.aspx?id=kYkdvChKUkWrwaznrhCCdO-80STG5SxAvb9Y_fx1cCNUQjVWRVRNSlE0Q08xNFhVNlFDSEFVTUJFNy4u"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 group"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="font-medium hidden sm:inline">Preencher Forms</span>
                    <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                  </a>
                )}
                <Badge
                  className={`text-lg px-4 py-2 ${progress === 100 ? "bg-green-600 text-white" : "bg-white/10 text-foreground border border-white/15"}`}
                >
                  {progress}%
                </Badge>
              </div>
            </div>

            <div className="mb-8">
              <Progress value={progress} className="h-3 bg-white/10 [&>div]:bg-green-500" />
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/15 overflow-visible shadow-lg">
              <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground">Atividades</h2>
                <div className="flex items-center gap-3">
                  {canEdit && completedCount > 0 && (
                    <div className="hidden sm:flex items-center gap-2 text-sm text-green-400">
                      <Save className="w-4 h-4" />
                      <span>Salvo automaticamente</span>
                    </div>
                  )}
                  {canManageMatrixTasks && (
                    <Button
                      size="sm"
                      onClick={() => { setNewTaskName(""); setAddOpen(true); }}
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-white/10">
                {folder.tarefas.map((tarefa: any, index) => {
                  const completed = isCompleted(tarefa.id);
                  const isCustom = !!tarefa.__custom;
                  return (
                    <li
                      key={tarefa.id}
                      onClick={() => canEdit ? handleToggleTask(tarefa.id, folder) : toast.error("Você só pode concluir tarefas do seu cargo.")}
                      className={`relative grid grid-cols-[1.5rem_minmax(0,1fr)] items-start sm:items-center gap-3 sm:gap-4 py-4 pl-4 pr-16 sm:py-5 sm:pl-5 sm:pr-20 transition-all duration-300 animate-fade-in ${
                        canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                      } ${
                        completed
                          ? "bg-green-500/10 hover:bg-green-500/20"
                          : canEdit ? "hover:bg-white/5" : ""
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className={`shrink-0 pt-0.5 sm:pt-0 transition-all duration-300 ${completed ? "scale-110" : "scale-100"}`}>
                        {completed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : canEdit ? (
                          <Circle className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`font-medium min-w-0 flex-1 break-words leading-snug transition-all duration-300 text-foreground ${
                        completed ? "line-through text-muted-foreground" : ""
                      }`}>
                        {tarefa.nome}
                        {isCustom && (
                          <Badge variant="outline" className="ml-2 text-[10px] border-purple-400 text-purple-300 bg-purple-500/10">
                            personalizada
                          </Badge>
                        )}
                      </span>
                      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 items-center justify-end gap-2">
                        {canManageMatrixTasks && (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive shadow-sm transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                            title="Excluir atividade"
                            aria-label="Excluir atividade"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCustom) handleRemoveCustomTask(tarefa.id);
                              else handleHideDefaultTask(tarefa.id);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        {completed && !canManageMatrixTasks && (
                          <Badge className="hidden sm:inline-flex text-xs bg-green-500/15 text-green-300 border-green-500/30 gap-1 shrink-0">
                            <Sparkles className="w-3 h-3" />
                            Salvo
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {canEdit && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                <Save className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-200">
                  Suas marcações são salvas automaticamente. O progresso fica registrado até o fim do mês.
                </p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Grid View - Parchment Style
  return (
    <Layout>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <EditablePageTitle pageKey="matriz" defaultValue="Matriz de Responsabilidades" className="text-2xl sm:text-4xl font-bold italic text-foreground mb-1 sm:mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma função para visualizar o progresso.
                </p>
                <p className="text-orange-300 text-xs sm:text-sm mt-2 italic">
                  * Progresso zerado no dia 01 de cada mês.
                </p>
              </div>
              
              <a
                href="https://forms.office.com/Pages/ResponsePage.aspx?id=kYkdvChKUkWrwaznrhCCdO-80STG5SxAvb9Y_fx1cCNUQjVWRVRNSlE0Q08xNFhVNlFDSEFVTUJFNy4u"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2.5 sm:py-3 rounded-xl shadow-lg transition-all w-full sm:w-auto hover:scale-105"
              >
                <ClipboardList className="w-5 h-5" />
                <span className="font-medium">Preencher Forms</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {foldersWithCustom.map((folder, index) => {
              const progress = getProgress(folder);
              const completedCount = getCompletedCount(folder);
              const canEdit = canEditFolder(folder);
              const hasProgress = progress > 0;
              const isComplete = progress === 100;
              
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className={`bg-white/5 backdrop-blur-sm rounded-2xl border-2 ${folder.borderColor} p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in group relative shadow-md ${
                    isComplete ? "border-green-400/60 bg-green-500/5" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Status Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    {isComplete && (
                      <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5 gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        Concluído
                      </Badge>
                    )}
                    {hasProgress && !isComplete && (
                      <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 gap-1 shadow-sm">
                        <Save className="w-3 h-3" />
                        Em progresso
                      </Badge>
                    )}
                    {canEdit && (
                      <Badge className="bg-purple-700 text-white text-[10px] px-2 py-0.5 shadow-sm">
                        Seu cargo
                      </Badge>
                    )}
                    {!canEdit && !canManageMatrixTasks && !hasProgress && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border border-white/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-inner">
                      <img 
                        src={folder.iconSrc} 
                        alt={folder.cargo} 
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 text-foreground">{folder.cargo}</h3>

                  {/* Activities Count */}
                  <div className="flex items-center gap-2 mb-5">
                    {hasProgress ? (
                      <>
                        <CheckCircle2 className={`w-4 h-4 ${isComplete ? "text-green-400" : "text-amber-400"}`} />
                        <span className={`text-sm font-medium ${isComplete ? "text-green-400" : "text-amber-400"}`}>
                          {completedCount}/{folder.tarefas.length} salvos
                        </span>
                      </>
                    ) : (
                      <>
                        <Folder className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{folder.tarefas.length} atividades</span>
                      </>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Progresso
                      </span>
                      <span className={`text-sm font-bold ${
                        isComplete ? "text-green-400" : hasProgress ? "text-amber-400" : "text-muted-foreground"
                      }`}>
                        {progress}%
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={`h-2.5 bg-white/10 ${isComplete ? "[&>div]:bg-green-500" : hasProgress ? "[&>div]:bg-amber-500" : ""}`} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Matriz;
