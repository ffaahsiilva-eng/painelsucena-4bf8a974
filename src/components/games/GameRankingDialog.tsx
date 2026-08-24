import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Star, Pencil, Check, X } from "lucide-react";
import { GameScore } from "@/hooks/useGameScores";
import { useIsAdmin } from "@/hooks/useUserRole";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import crownFrame from "@/assets/king-crown-frame.png";

const GAME_INFO: Record<string, { emoji: string; label: string }> = {
  recycling: { emoji: "♻️", label: "Coleta Seletiva" },
  epi: { emoji: "🦺", label: "Quiz EPIs" },
  rocagem: { emoji: "🌾", label: "Quiz Roçagem" },
  gabiao: { emoji: "🪨", label: "Quiz Gabião" },
  checkers: { emoji: "♟️", label: "Damas" },
  domino: { emoji: "🁫", label: "Dominó" },
};

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (position === 1) return <Medal className="w-5 h-5 text-gray-400" />;
  if (position === 2) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-bold w-5 text-center">{position + 1}</span>;
}

interface GameRankingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  scores: GameScore[] | null;
  boardStats: any[] | null;
}

export function GameRankingDialog({ open, onOpenChange, gameId, scores, boardStats }: GameRankingDialogProps) {
  const isBoardGame = gameId === "checkers" || gameId === "domino";
  const info = GAME_INFO[gameId] || { emoji: "🎮", label: gameId };
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editValueLosses, setEditValueLosses] = useState("");

  const prevMonth = format(subMonths(new Date(), 1), "yyyy-MM");
  const prevMonthLabel = format(subMonths(new Date(), 1), "MMMM 'de' yyyy", { locale: ptBR });

  const { data: champion } = useQuery({
    queryKey: ["monthly-champion", gameId, prevMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_game_champions")
        .select("*")
        .eq("game_id", gameId)
        .eq("month_year", prevMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: fullScores } = useQuery({
    queryKey: ["full-game-scores", gameId],
    queryFn: async () => {
      if (isBoardGame) return null;
      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .limit(100);
      if (error) throw error;
      const seen = new Set<string>();
      return (data as GameScore[]).filter(r => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
    },
    enabled: open && !isBoardGame,
  });

  const { data: fullBoardStats } = useQuery({
    queryKey: ["full-board-stats", gameId],
    queryFn: async () => {
      if (!isBoardGame) return null;
      const table = gameId === "checkers" ? "checkers_stats" : "domino_stats";
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("wins", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && isBoardGame,
  });

  const displayScores = fullScores || scores || [];
  const displayBoard = fullBoardStats || boardStats || [];

  const handleEditQuizScore = async (id: string) => {
    const newScore = parseInt(editValue);
    if (isNaN(newScore) || newScore < 0) {
      toast.error("Pontuação inválida");
      return;
    }
    const { error } = await supabase.from("game_scores").update({ score: newScore }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar pontuação");
      return;
    }
    toast.success("Pontuação atualizada!");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["full-game-scores", gameId] });
    queryClient.invalidateQueries({ queryKey: ["game-scores"] });
    queryClient.invalidateQueries({ queryKey: ["game-scores-all-top"] });
  };

  const handleEditBoardStats = async (id: string) => {
    const wins = parseInt(editValue);
    const losses = parseInt(editValueLosses);
    if (isNaN(wins) || isNaN(losses) || wins < 0 || losses < 0) {
      toast.error("Valores inválidos");
      return;
    }
    const table = gameId === "checkers" ? "checkers_stats" : "domino_stats";
    const { error } = await supabase.from(table).update({ wins, losses }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar estatísticas");
      return;
    }
    toast.success("Estatísticas atualizadas!");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["full-board-stats", gameId] });
    queryClient.invalidateQueries({ queryKey: ["checkers-stats-ranking"] });
    queryClient.invalidateQueries({ queryKey: ["domino-stats-ranking"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{info.emoji}</span>
            <span>{info.label}</span>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        {champion && (
          <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 p-3 mb-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                Campeão de {prevMonthLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-yellow-500">
                  <AvatarImage src={champion.avatar_url || undefined} />
                  <AvatarFallback className="text-sm font-bold">{champion.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <img loading="lazy" decoding="async" src={crownFrame} alt="" className="absolute -top-3 -left-1 w-12 h-6 object-contain pointer-events-none" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{champion.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {champion.game_type === "board" ? `${champion.score} vitórias` : `${champion.score} pontos`}
                </p>
              </div>
              <span className="text-2xl">👑</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Ranking Atual</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
          {!isBoardGame && displayScores.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : i < 3 ? "bg-muted/50" : "bg-muted/30"}`}>
              <MedalIcon position={i} />
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {s.user_name.split(" ")[0]}
              </span>
              {editingId === s.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-16 h-6 text-xs px-1"
                    min={0}
                  />
                  <button onClick={() => handleEditQuizScore(s.id)} className="text-green-600 hover:text-green-500">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-bold text-primary">{s.score} pts</span>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditValue(String(s.score)); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {isBoardGame && displayBoard.map((s: any, i: number) => (
            <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : i < 3 ? "bg-muted/50" : "bg-muted/30"}`}>
              <MedalIcon position={i} />
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{s.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {s.user_name.split(" ")[0]}
              </span>
              {editingId === s.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-12 h-6 text-xs px-1"
                    placeholder="V"
                    min={0}
                  />
                  <Input
                    type="number"
                    value={editValueLosses}
                    onChange={(e) => setEditValueLosses(e.target.value)}
                    className="w-12 h-6 text-xs px-1"
                    placeholder="D"
                    min={0}
                  />
                  <button onClick={() => handleEditBoardStats(s.id)} className="text-green-600 hover:text-green-500">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex gap-2 text-xs font-bold">
                    <span className="text-green-600 dark:text-green-400">{s.wins}V</span>
                    <span className="text-red-500 dark:text-red-400">{s.losses}D</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditValue(String(s.wins)); setEditValueLosses(String(s.losses)); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {!isBoardGame && displayScores.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma pontuação registrada ainda.</p>
          )}
          {isBoardGame && displayBoard.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma partida registrada ainda.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}