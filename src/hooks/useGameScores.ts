import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GameScore {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  game_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  best_streak: number;
  played_at: string;
}

export function useGameScores(gameId?: string) {
  return useQuery({
    queryKey: ["game-scores", gameId],
    queryFn: async () => {
      let query = supabase
        .from("game_scores")
        .select("*")
        .order("score", { ascending: false });

      if (gameId) {
        query = query.eq("game_id", gameId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as GameScore[];
    },
  });
}

export function useTopScoresByGame() {
  return useQuery({
    queryKey: ["game-scores-all-top"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Group by game, keep top 5 per game (best score per user)
      const byGame: Record<string, GameScore[]> = {};
      for (const row of (data as GameScore[])) {
        if (!byGame[row.game_id]) byGame[row.game_id] = [];
        // Only keep best score per user per game
        if (!byGame[row.game_id].find((r) => r.user_id === row.user_id)) {
          byGame[row.game_id].push(row);
        }
      }
      // Limit to top 5 per game
      for (const key of Object.keys(byGame)) {
        byGame[key] = byGame[key].slice(0, 5);
      }
      return byGame;
    },
  });
}

export function useSaveGameScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      gameId: string;
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      bestStreak: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        user_name: profile?.full_name || "Jogador",
        avatar_url: profile?.avatar_url || null,
        game_id: params.gameId,
        score: params.score,
        correct_answers: params.correctAnswers,
        total_questions: params.totalQuestions,
        best_streak: params.bestStreak,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-scores"] });
      queryClient.invalidateQueries({ queryKey: ["game-scores-all-top"] });
    },
  });
}
