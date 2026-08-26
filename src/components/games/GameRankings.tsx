// @ts-nocheck
import { useState } from "react";
import { useTopScoresByGame } from "@/hooks/useGameScores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Info } from "lucide-react";
import { GameRankingDialog } from "./GameRankingDialog";

const GAME_INFO: Record<string, { emoji: string; label: string }> = {
  recycling: { emoji: "♻️", label: "Coleta Seletiva" },
  epi: { emoji: "🦺", label: "Quiz EPIs" },
  rocagem: { emoji: "🌾", label: "Quiz Roçagem" },
  gabiao: { emoji: "🪨", label: "Quiz Gabião" },
  checkers: { emoji: "♟️", label: "Damas" },
  domino: { emoji: "🁫", label: "Dominó" },
};

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
  if (position === 1) return <Medal className="w-4 h-4 text-gray-400" />;
  if (position === 2) return <Medal className="w-4 h-4 text-amber-700" />;
  return <span className="text-xs text-muted-foreground font-bold w-4 text-center">{position + 1}</span>;
}

export function GameRankings() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const { data: quizScores, isLoading: loadingQuiz } = useTopScoresByGame();
  const { data: checkersStats, isLoading: loadingCheckers } = useQuery({
    queryKey: ["checkers-stats-ranking"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkers_stats")
        .select("*")
        .order("wins", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
  const { data: dominoStats, isLoading: loadingDomino } = useQuery({
    queryKey: ["domino-stats-ranking"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("domino_stats")
        .select("*")
        .order("wins", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingQuiz || loadingCheckers || loadingDomino;
  const gameIds = ["recycling", "epi", "rocagem", "gabiao", "checkers", "domino"];
  const hasAnyData = !isLoading && (
    Object.values(quizScores || {}).some(arr => arr.length > 0) ||
    (checkersStats && checkersStats.length > 0) ||
    (dominoStats && dominoStats.length > 0)
  );

  if (isLoading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          Carregando ranking...
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyData) return null;

  const quizGames = gameIds.filter(id => {
    if (id === "checkers") return checkersStats && checkersStats.length > 0;
    if (id === "domino") return dominoStats && dominoStats.length > 0;
    return quizScores?.[id]?.length;
  });

  const getDialogProps = () => {
    if (!selectedGame) return null;
    const isBoardGame = selectedGame === "checkers" || selectedGame === "domino";
    return {
      gameId: selectedGame,
      scores: isBoardGame ? null : (quizScores?.[selectedGame] || []),
      boardStats: selectedGame === "checkers" ? checkersStats : selectedGame === "domino" ? dominoStats : null,
    };
  };

  const dialogProps = getDialogProps();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold text-foreground">Ranking dos Games</h3>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-xs text-blue-600 dark:text-blue-400">
          Os rankings são zerados todo dia 01 de cada mês. Jogue e conquiste o topo! 🏆
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {quizGames.map(id => {
          const info = GAME_INFO[id];
          const isBoardGame = id === "checkers" || id === "domino";
          const scores = isBoardGame ? null : (quizScores?.[id] || []);
          const cStats = id === "checkers" ? checkersStats : id === "domino" ? dominoStats : null;

          return (
            <Card 
              key={id} 
              className="border border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => setSelectedGame(id)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{info.emoji}</span>
                  <span className="text-xs font-bold text-foreground truncate">{info.label}</span>
                </div>
                <div className="space-y-1.5">
                  {!isBoardGame && scores && scores.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1 p-1.5 rounded-md bg-muted/30">
                      <MedalIcon position={i} />
                      <Avatar className="w-5 h-5 shrink-0">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{s.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                        {s.user_name.split(" ")[0]}
                      </span>
                      <span className="text-[10px] font-bold text-primary shrink-0">{s.score}</span>
                    </div>
                  ))}
                  {isBoardGame && cStats && cStats.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1 p-1.5 rounded-md bg-muted/30">
                      <MedalIcon position={i} />
                      <Avatar className="w-5 h-5 shrink-0">
                        <AvatarImage src={'avatar_url' in s ? (s as any).avatar_url || undefined : undefined} />
                        <AvatarFallback className="text-[10px]">{s.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                        {s.user_name.split(" ")[0]}
                      </span>
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 shrink-0">{s.wins}V</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dialogProps && (
        <GameRankingDialog
          open={!!selectedGame}
          onOpenChange={(open) => !open && setSelectedGame(null)}
          {...dialogProps}
        />
      )}
    </div>
  );
}
