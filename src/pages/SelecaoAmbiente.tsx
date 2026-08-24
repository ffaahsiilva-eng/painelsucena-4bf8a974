import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2, Lock, Plus, Trash2, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment, type EnvironmentId } from "@/hooks/useEnvironment";
import { useMyEnvironmentAccess } from "@/hooks/useEnvironmentAccess";
import { useEnvironmentsList } from "@/hooks/useEnvironmentsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveStorageUrl } from "@/lib/storage";

export default function SelecaoAmbiente() {
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { setEnvironment } = useEnvironment();
  const { toast } = useToast();
  const { environments: allowedEnvs, isLoading: accessLoading, isAdmin } = useMyEnvironmentAccess();
  const { environments: allEnvs, isLoading: envsLoading, createEnvironment, deleteEnvironment, isBuiltin } = useEnvironmentsList();
  const [user, setUser] = useState<{ fullName: string; avatarUrl: string | null } | null>(null);
  const [selecting, setSelecting] = useState<EnvironmentId | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", data.user.id)
        .maybeSingle();
      
      const resolvedAvatar = profile?.avatar_url ? await resolveStorageUrl(profile.avatar_url) : null;
      
      setUser({
        fullName: profile?.full_name || data.user.email?.split("@")[0] || "Usuário",
        avatarUrl: resolvedAvatar,
      });
    })();
  }, [navigate]);

  const handleSelect = async (envId: EnvironmentId) => {
    setSelecting(envId);
    setEnvironment(envId);
    const label = allEnvs.find((e) => e.id === envId)?.label ?? envId;
    
    // Inicia a transição de login (mesmo que já esteja logado, usamos o gate para efeito visual)
    const payload = {
      userName: user?.fullName,
      userAvatar: user?.avatarUrl,
      destination: "/"
    };
    
    sessionStorage.setItem("loginTransitionInProgress", "true");
    sessionStorage.setItem("loginTransitionStage", "play");
    sessionStorage.setItem("loginTransitionPayload", JSON.stringify(payload));
    
    // Dispara o evento para o LoginTransitionGate
    window.dispatchEvent(new Event("login-transition"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth", { replace: true });
  };

  const handleCreate = async () => {
    const label = newName.trim();
    if (label.length < 2) return;
    try {
      await createEnvironment.mutateAsync({ label });
      toast({ title: "Ambiente criado", description: `${label} está pronto.` });
      setShowCreate(false);
      setNewName("");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || confirmText.toUpperCase() !== "EXCLUIR") return;
    try {
      await deleteEnvironment.mutateAsync({ id: deleteTarget.id });
      toast({ title: "Ambiente excluído", description: deleteTarget.label });
      setDeleteTarget(null);
      setConfirmText("");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050505] text-white">
      {/* Background Cinematic */}
      <div className="absolute inset-0 z-0">
        {settings.environment_selection_background_url ? (
          /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(settings.environment_selection_background_url) ? (
            <video
              src={settings.environment_selection_background_url}
              className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              
            />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 animate-pulse-slow transition-opacity duration-700"
              style={{ backgroundImage: `url("${settings.environment_selection_background_url}")` }}
            />
          )
        ) : (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 animate-pulse-slow"
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2070")' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505]" />
        
        {/* Decorative Golden Glows */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#c9a84c]/10 blur-[120px] rounded-full animate-float-slow" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#c9a84c]/15 blur-[120px] rounded-full animate-float-delayed" />
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <header className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 group cursor-default"
          >
            <div className="relative">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-[#c9a84c]/30 group-hover:border-[#c9a84c] transition-colors" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[#c9a84c]/20 border-2 border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] font-bold text-lg group-hover:border-[#c9a84c] transition-colors">
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-[#050505] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c]/70 font-bold">Autenticado como</p>
              <h3 className="text-lg font-bold tracking-tight text-white/90">{user?.fullName || "Carregando..."}</h3>
            </div>
          </motion.div>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/5 gap-2 transition-all rounded-full border border-white/5 px-6"
          >
            <LogOut className="h-4 w-4" />
            Encerrar Sessão
          </Button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 space-y-4"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              Selecione o <span className="text-[#c9a84c] drop-shadow-[0_0_20px_rgba(201,168,76,0.3)]">Ambiente</span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg mx-auto font-medium">
              Gestão inteligente de operações em tempo real. Escolha a unidade de trabalho para prosseguir.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {allEnvs.map((env, idx) => {
              const hasAccess = isAdmin || allowedEnvs.includes(env.id as any);
              const isLocked = !accessLoading && !hasAccess;
              const isBarcarena = env.label.toLowerCase().includes("barcarena");
              
              return (
                <motion.div
                  key={env.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative group h-[420px] rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${
                    isLocked 
                    ? "border-white/5 opacity-50 bg-white/[0.02]" 
                    : "border-white/10 hover:border-[#c9a84c]/50 bg-white/[0.03] hover:bg-white/[0.07] cursor-pointer"
                  }`}
                  onClick={() => !isLocked && handleSelect(env.id as any)}
                >
                  {/* Card Background Visual */}
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                    <div className={`absolute inset-0 bg-gradient-to-br ${isBarcarena ? "from-blue-500/20" : "from-emerald-500/20"} to-transparent`} />
                  </div>
                  
                  {/* Icon Container */}
                  <div className="relative z-10 pt-10 px-10">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:border-[#c9a84c]/50 group-hover:shadow-[0_0_30px_rgba(201,168,76,0.2)]">
                      {isBarcarena ? (
                        <div className="relative">
                          <Plus className="h-10 w-10 text-[#c9a84c]" strokeWidth={1.5} />
                          <div className="absolute inset-0 blur-lg bg-[#c9a84c] opacity-50 group-hover:opacity-80" />
                        </div>
                      ) : (
                        <div className="relative">
                          <ChevronRight className="h-10 w-10 text-[#c9a84c]" strokeWidth={1.5} />
                          <div className="absolute inset-0 blur-lg bg-[#c9a84c] opacity-50 group-hover:opacity-80" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 mt-8 px-10 flex flex-col h-[220px]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-[10px] font-bold tracking-widest uppercase">
                        {isBarcarena ? "Principal" : "Unidade"}
                      </span>
                      {isLocked && (
                        <span className="flex items-center gap-1 text-white/40 text-[10px] font-bold tracking-widest uppercase">
                          <Lock className="h-3 w-3" /> Bloqueado
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:text-[#c9a84c] transition-colors">{env.label}</h2>
                    <p className="text-white/40 text-[15px] leading-relaxed line-clamp-2">
                      {env.description || "Acesse o painel completo de controle operacional desta unidade."}
                    </p>

                    <div className="mt-auto pb-10">
                      <div className="flex items-center justify-between group/btn">
                        <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">
                          {isLocked ? "Solicitar Acesso" : "Entrar no Ambiente"}
                        </span>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isLocked 
                          ? "bg-white/5 text-white/20" 
                          : "bg-[#c9a84c] text-black group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(201,168,76,0.4)]"
                        }`}>
                          {selecting === env.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && !isBuiltin(env.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: env.id, label: env.label });
                      }}
                      className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all scale-0 group-hover:scale-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}

            {/* Create New Card */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowCreate(true)}
                className="relative group h-[420px] rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-[#c9a84c]/50 bg-white/[0.02] hover:bg-[#c9a84c]/[0.02] flex flex-col items-center justify-center cursor-pointer transition-all duration-500"
              >
                <div className="w-16 h-16 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Plus className="h-8 w-8 text-[#c9a84c]" />
                </div>
                <h3 className="text-xl font-bold text-white/60 group-hover:text-[#c9a84c] transition-colors">Novo Ambiente</h3>
                <p className="text-white/30 text-sm mt-2 text-center px-10">Expanda as operações do sistema</p>
              </motion.div>
            )}
          </div>
        </main>

        <footer className="py-8 text-center">
          <p className="text-white/20 text-xs font-medium tracking-[0.2em] uppercase">
            Sistema Gerencial Sucena &copy; 2026 · Todos os direitos reservados
          </p>
        </footer>
      </div>

      {/* Overlays/Modals */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Criar Novo Ambiente</DialogTitle>
            <DialogDescription className="text-white/40">Defina o nome da nova operação operacional.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[#c9a84c] font-bold text-xs uppercase tracking-wider">Nome da Unidade</Label>
              <Input 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Barcarena II"
                className="bg-white/5 border-white/10 focus:border-[#c9a84c]/50 focus:ring-0 text-lg py-6 rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white/60">Cancelar</Button>
            <Button onClick={handleCreate} className="bg-[#c9a84c] text-black hover:bg-[#c9a84c]/90 rounded-xl px-8 font-bold">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#0f0f0f] border-red-500/20 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Excluir Ambiente
            </DialogTitle>
            <DialogDescription className="text-white/40 italic">Esta ação é irreversível.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-white/70">Todos os dados relacionados a <strong>{deleteTarget?.label}</strong> serão permanentemente apagados.</p>
            <div className="space-y-2">
              <Label className="text-red-500 font-bold text-xs uppercase tracking-wider">Digite EXCLUIR para confirmar</Label>
              <Input 
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="bg-red-500/5 border-red-500/10 focus:border-red-500/50 focus:ring-0 text-lg py-6 rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-white/60">Cancelar</Button>
            <Button 
              onClick={handleDelete}
              disabled={confirmText.toUpperCase() !== "EXCLUIR"}
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-8 font-bold disabled:opacity-30"
            >
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
