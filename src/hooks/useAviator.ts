import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTables } from "@/lib/realtimeManager";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export type AviatorPhase = "waiting" | "running" | "crashed";

export interface AviatorBet {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  bet_amount: number;
  cashed_out_at: number | null;
  payout: number | null;
  round_id: string;
  created_at: string;
}

export interface AviatorRound {
  id: string;
  crash_point: number;
  status: string;
  started_at: string | null;
  crashed_at: string | null;
  created_at: string;
}

export interface SessionStats {
  roundsPlayed: number;
  totalBet: number;
  totalWon: number;
  wins: number;
  losses: number;
  betsPlaced: number;
  currentStreak: number;
  bestStreak: number;
  bestMultiplier: number;
  sessionStart: number;
  profitLoss: number;
  winRate: number;
  avgMultiplier: number;
  biggestWin: number;
  biggestLoss: number;
}

const WAIT_DURATION = 8000;
const CRASH_PAUSE = 3000;

function generateCrashPoint(): number {
  const h = Math.random();

  // 4% chance of instant crash at 1.00
  if (h < 0.04) return 1.0;

  // 3% chance of a moderate-high crash (5x–20x)
  if (h > 0.97) {
    const crash = 5 + Math.random() * 15; // range 5x to 20x
    return Math.floor(crash * 100) / 100;
  }

  // Remaining 93%: spread across 1.01–10x with a smooth curve
  const normalized = (h - 0.04) / 0.93; // normalize to 0–1
  const crash = 1.0 / (1 - Math.pow(normalized, 1.15));
  const clamped = Math.min(crash, 10);
  return Math.max(1.01, Math.floor(clamped * 100) / 100);
}

const initialStats: SessionStats = {
  roundsPlayed: 0,
  totalBet: 0,
  totalWon: 0,
  wins: 0,
  losses: 0,
  betsPlaced: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestMultiplier: 0,
  sessionStart: Date.now(),
  profitLoss: 0,
  winRate: 0,
  avgMultiplier: 0,
  biggestWin: 0,
  biggestLoss: 0,
};

export function useAviator() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const [phase, setPhase] = useState<AviatorPhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [lastCrash, setLastCrash] = useState<number | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [waitCountdown, setWaitCountdown] = useState(0);
  const [balance, setBalance] = useState(0);
  const [currentBet, setCurrentBet] = useState<AviatorBet | null>(null);
  const [currentBet2, setCurrentBet2] = useState<AviatorBet | null>(null);
  const [roundBets, setRoundBets] = useState<AviatorBet[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ ...initialStats });
  const [betHistory, setBetHistory] = useState<Array<{ amount: number; payout: number | null; multiplier: number; won: boolean; time: string }>>([]);

  // Refs
  const mountedRef = useRef(true);
  const animFrameRef = useRef<number | null>(null);
  const roundRef = useRef<AviatorRound | null>(null);
  const phaseRef = useRef<AviatorPhase>("waiting");
  const multiplierRef = useRef(1.0);
  const currentBetRef = useRef<AviatorBet | null>(null);
  const currentBet2Ref = useRef<AviatorBet | null>(null);
  const balanceRef = useRef(0);
  const crashHandledRef = useRef(false);
  const nextRoundScheduledRef = useRef(false);
  const creatingRef = useRef(false);

  // Sync refs
  phaseRef.current = phase;
  multiplierRef.current = multiplier;
  currentBetRef.current = currentBet;
  currentBet2Ref.current = currentBet2;
  balanceRef.current = balance;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─── Stats ───
  const updateStats = useCallback((won: boolean, betAmount: number, payout: number | null, cashoutMultiplier: number) => {
    setSessionStats(prev => {
      const newWins = won ? prev.wins + 1 : prev.wins;
      const newLosses = won ? prev.losses : prev.losses + 1;
      const newBetsPlaced = prev.betsPlaced + 1;
      const newTotalBet = prev.totalBet + betAmount;
      const newTotalWon = prev.totalWon + (payout || 0);
      const newStreak = won ? prev.currentStreak + 1 : 0;
      const netProfit = (payout || 0) - betAmount;
      return {
        ...prev,
        betsPlaced: newBetsPlaced,
        totalBet: newTotalBet,
        totalWon: newTotalWon,
        wins: newWins,
        losses: newLosses,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        bestMultiplier: won ? Math.max(prev.bestMultiplier, cashoutMultiplier) : prev.bestMultiplier,
        profitLoss: newTotalWon - newTotalBet,
        winRate: newBetsPlaced > 0 ? (newWins / newBetsPlaced) * 100 : 0,
        avgMultiplier: won && newWins > 0
          ? ((prev.avgMultiplier * (newWins - 1)) + cashoutMultiplier) / newWins
          : prev.avgMultiplier,
        biggestWin: Math.max(prev.biggestWin, netProfit > 0 ? netProfit : 0),
        biggestLoss: Math.min(prev.biggestLoss, netProfit < 0 ? netProfit : 0),
      };
    });
    setBetHistory(prev => [{
      amount: betAmount,
      payout,
      multiplier: cashoutMultiplier,
      won,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }, ...prev].slice(0, 50));
  }, []);

  // ─── Balance ───
  const loadBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("double_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setBalance(data.balance);
    } else {
      await supabase.from("double_balances").insert({ user_id: user.id, balance: 5000 });
      setBalance(5000);
    }
  }, [user]);

  // ─── Crash History ───
  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("aviator_rounds")
      .select("crash_point")
      .eq("status", "crashed")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setCrashHistory(data.map(r => r.crash_point));
      if (data.length > 0) setLastCrash(data[0].crash_point);
    }
  }, []);

  // ─── Crash Handler (ref-based to avoid stale closures) ───
  const onCrashRef = useRef<(round: AviatorRound) => void>(() => {});
  onCrashRef.current = (round: AviatorRound) => {
    if (crashHandledRef.current) return;
    crashHandledRef.current = true;

    // Stop animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setMultiplier(round.crash_point);
    setPhase("crashed");
    phaseRef.current = "crashed";
    setLastCrash(round.crash_point);
    setCrashHistory(prev => [round.crash_point, ...prev].slice(0, 20));

    // Persist crash in DB (no-op if already crashed by another client)
    if (round.status !== "crashed") {
      supabase.from("aviator_rounds")
        .update({ status: "crashed", crashed_at: new Date().toISOString() })
        .eq("id", round.id)
        .neq("status", "crashed")
        .then(() => {});
    }

    // Handle user's active bets
    const bet = currentBetRef.current;
    const bet2 = currentBet2Ref.current;
    if (bet || bet2) {
      setSessionStats(prev => ({ ...prev, roundsPlayed: prev.roundsPlayed + 1 }));
    }
    if (bet && !bet.cashed_out_at) {
      updateStats(false, bet.bet_amount, null, round.crash_point);
      toast.error(`Crash em ${round.crash_point.toFixed(2)}x! Você perdeu R$ ${bet.bet_amount.toFixed(2)}`);
    }
    if (bet2 && !bet2.cashed_out_at) {
      updateStats(false, bet2.bet_amount, null, round.crash_point);
    }

    // Refresh balance
    loadBalance();

    // Schedule next round
    if (!nextRoundScheduledRef.current) {
      nextRoundScheduledRef.current = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        setCurrentBet(null);
        setCurrentBet2(null);
        currentBetRef.current = null;
        currentBet2Ref.current = null;
        setRoundBets([]);
        initRoundRef.current();
      }, CRASH_PAUSE);
    }
  };

  // ─── Animation Loop ───
  const startAnimLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const loop = () => {
      if (!mountedRef.current) return;
      const round = roundRef.current;

      if (!round || !round.started_at) {
        // If round exists but has no started_at, it's stale — trigger re-init
        if (round && !round.started_at) {
          initRoundRef.current();
          return;
        }
        setPhase("waiting");
        setWaitCountdown(0);
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Already crashed via realtime
      if (round.status === "crashed") {
        onCrashRef.current(round);
        return;
      }

      const now = Date.now();
      const flyAt = new Date(round.started_at).getTime();

      if (now < flyAt) {
        // Waiting phase
        if (phaseRef.current !== "waiting") {
          setPhase("waiting");
          phaseRef.current = "waiting";
        }
        setWaitCountdown(Math.ceil((flyAt - now) / 1000));
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Running phase
      if (phaseRef.current !== "running") {
        setPhase("running");
        phaseRef.current = "running";
        // Update DB status (first-writer-wins)
        if (round.status === "waiting") {
          supabase.from("aviator_rounds")
            .update({ status: "running" })
            .eq("id", round.id)
            .eq("status", "waiting")
            .then(() => {});
          round.status = "running";
        }
      }

      const elapsed = (now - flyAt) / 1000;
      const m = Math.floor(Math.pow(Math.E, elapsed * 0.08) * 100) / 100;
      setMultiplier(m);
      multiplierRef.current = m;

      if (m >= round.crash_point) {
        onCrashRef.current(round);
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // ─── Initialize / Create Round ───
  const initRoundRef = useRef<() => Promise<void>>(async () => {});
  initRoundRef.current = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;

    try {
      // Small random delay to reduce collision when multiple clients create rounds
      await new Promise(r => setTimeout(r, Math.random() * 400));
      if (!mountedRef.current) return;

      // Find an active round
      const { data: active } = await supabase
        .from("aviator_rounds")
        .select("*")
        .in("status", ["waiting", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        const round = active as unknown as AviatorRound;

        // Detect stale rounds
        let isStale = !round.started_at;
        
        if (!isStale && round.started_at) {
          const elapsed = (Date.now() - new Date(round.started_at).getTime()) / 1000;
          
          // Waiting but started_at is far in the past (> 2 min)
          if (round.status === "waiting" && elapsed > 120) {
            isStale = true;
          }
          
          // Running but multiplier already exceeded crash point (already crashed)
          if (round.status === "running" && elapsed > 0) {
            const currentMultiplier = Math.pow(Math.E, elapsed * 0.08);
            if (currentMultiplier >= round.crash_point) {
              isStale = true;
            }
          }
        }
        
        if (isStale) {
          // Mark stale round as crashed and create a fresh one
          await supabase.from("aviator_rounds")
            .update({ status: "crashed", crashed_at: new Date().toISOString() })
            .eq("id", round.id)
            .neq("status", "crashed");
          
          // Update history with this crash
          setCrashHistory(prev => [round.crash_point, ...prev].slice(0, 20));
          setLastCrash(round.crash_point);
          
          // Fall through to create a new round below
        } else {
          roundRef.current = round;
          setCurrentRoundId(round.id);
          setCrashPoint(round.crash_point);
          crashHandledRef.current = false;
          nextRoundScheduledRef.current = false;

          // Load existing bets for this round
          const { data: bets } = await supabase
            .from("aviator_bets")
            .select("*")
            .eq("round_id", round.id);
          if (bets) setRoundBets(bets as unknown as AviatorBet[]);

          // Find user's own bets
          if (user) {
            const userBets = ((bets || []) as unknown as AviatorBet[]).filter(b => b.user_id === user.id);
            setCurrentBet(userBets[0] || null);
            currentBetRef.current = userBets[0] || null;
            setCurrentBet2(userBets[1] || null);
            currentBet2Ref.current = userBets[1] || null;
          }

          startAnimLoop();
          return;
        }
      }

      // No active round — create one
      const cp = generateCrashPoint();
      const flyAt = new Date(Date.now() + WAIT_DURATION).toISOString();

      const { data: newRound } = await supabase
        .from("aviator_rounds")
        .insert({ crash_point: cp, status: "waiting", started_at: flyAt })
        .select()
        .single();

      if (newRound) {
        const round = newRound as unknown as AviatorRound;
        roundRef.current = round;
        setCurrentRoundId(round.id);
        setCrashPoint(round.crash_point);
        crashHandledRef.current = false;
        nextRoundScheduledRef.current = false;
        setRoundBets([]);
        setCurrentBet(null);
        setCurrentBet2(null);
        currentBetRef.current = null;
        currentBet2Ref.current = null;
        startAnimLoop();
      }
    } finally {
      creatingRef.current = false;
    }
  };

  // ─── Switch to a new round (from realtime) ───
  const switchToRoundFromRealtime = useCallback((round: AviatorRound) => {
    roundRef.current = round;
    setCurrentRoundId(round.id);
    setCrashPoint(round.crash_point);
    crashHandledRef.current = false;
    nextRoundScheduledRef.current = false;
    setRoundBets([]);
    setCurrentBet(null);
    setCurrentBet2(null);
    currentBetRef.current = null;
    currentBet2Ref.current = null;
    startAnimLoop();
  }, [startAnimLoop]);

  // ─── Realtime Subscription ───
  useEffect(() => {
    return subscribeToTables([
      {
        cfg: { event: "INSERT", table: "aviator_rounds" },
        callback: (payload) => {
          const round = payload.new as AviatorRound;
          const current = roundRef.current;
          if (!current || current.status === "crashed" || crashHandledRef.current) {
            switchToRoundFromRealtime(round);
          }
        },
      },
      {
        cfg: { event: "UPDATE", table: "aviator_rounds" },
        callback: (payload) => {
          const round = payload.new as AviatorRound;
          if (roundRef.current?.id === round.id) {
            roundRef.current = round;
            if (round.status === "crashed") {
              onCrashRef.current(round);
            }
          }
        },
      },
      {
        cfg: { event: "INSERT", table: "aviator_bets" },
        callback: (payload) => {
          const bet = payload.new as unknown as AviatorBet;
          if (bet.round_id === roundRef.current?.id) {
            setRoundBets((prev) => (prev.some((b) => b.id === bet.id) ? prev : [...prev, bet]));
          }
        },
      },
      {
        cfg: { event: "UPDATE", table: "aviator_bets" },
        callback: (payload) => {
          const bet = payload.new as unknown as AviatorBet;
          if (bet.round_id === roundRef.current?.id) {
            setRoundBets((prev) => prev.map((b) => (b.id === bet.id ? bet : b)));
          }
        },
      },
    ]);
  }, [switchToRoundFromRealtime]);

  // ─── Mount Init ───
  useEffect(() => {
    loadBalance();
    loadHistory();
    initRoundRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-find user bets when user loads (may arrive after mount)
  useEffect(() => {
    if (user && roundRef.current) {
      supabase
        .from("aviator_bets")
        .select("*")
        .eq("round_id", roundRef.current.id)
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setCurrentBet(data[0] as unknown as AviatorBet);
            currentBetRef.current = data[0] as unknown as AviatorBet;
            if (data.length > 1) {
              setCurrentBet2(data[1] as unknown as AviatorBet);
              currentBet2Ref.current = data[1] as unknown as AviatorBet;
            }
          }
        });
    }
  }, [user]);

  // ─── Place Bet ───
  const placeBetSlot = useCallback(async (amount: number, slot: 1 | 2) => {
    if (!user || !profile) return;
    if (phaseRef.current !== "waiting") {
      toast.error("Espere a próxima rodada para apostar!");
      return;
    }
    const betRef = slot === 1 ? currentBetRef : currentBet2Ref;
    if (amount <= 0 || amount > balanceRef.current) {
      toast.error(amount > balanceRef.current ? "Saldo insuficiente!" : "Valor inválido!");
      return;
    }
    if (betRef.current) {
      toast.error("Você já apostou neste slot!");
      return;
    }

    setIsProcessing(true);
    try {
      const newBalance = balanceRef.current - amount;
      await supabase
        .from("double_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      setBalance(newBalance);

      const { data: bet } = await supabase
        .from("aviator_bets")
        .insert({
          user_id: user.id,
          user_name: profile.full_name || "Jogador",
          avatar_url: profile.avatar_url,
          bet_amount: amount,
          round_id: roundRef.current?.id || "",
        })
        .select()
        .single();

      if (bet) {
        const betData = bet as unknown as AviatorBet;
        if (slot === 1) { setCurrentBet(betData); currentBetRef.current = betData; }
        else { setCurrentBet2(betData); currentBet2Ref.current = betData; }
        // Also add locally for instant feedback (realtime will dedupe)
        setRoundBets(prev => prev.some(b => b.id === betData.id) ? prev : [...prev, betData]);
        toast.success(`Aposta ${slot} de R$ ${amount.toFixed(2)} realizada!`);
      }
    } catch {
      toast.error("Erro ao realizar aposta.");
    } finally {
      setIsProcessing(false);
    }
  }, [user, profile]);

  const placeBet = useCallback((amount: number) => placeBetSlot(amount, 1), [placeBetSlot]);
  const placeBet2 = useCallback((amount: number) => placeBetSlot(amount, 2), [placeBetSlot]);

  // ─── Cancel Bet ───
  const cancelBetSlot = useCallback(async (slot: 1 | 2) => {
    if (!user) return;
    if (phaseRef.current !== "waiting") return;
    const betRef = slot === 1 ? currentBetRef : currentBet2Ref;
    if (!betRef.current) return;

    setIsProcessing(true);
    try {
      const bet = betRef.current;
      const newBalance = balanceRef.current + bet.bet_amount;
      await supabase.from("double_balances").update({ balance: newBalance }).eq("user_id", user.id);
      setBalance(newBalance);
      await supabase.from("aviator_bets").delete().eq("id", bet.id);

      if (slot === 1) { setCurrentBet(null); currentBetRef.current = null; }
      else { setCurrentBet2(null); currentBet2Ref.current = null; }
      setRoundBets(prev => prev.filter(b => b.id !== bet.id));
      toast.info(`Aposta ${slot} cancelada! Saldo devolvido.`);
    } catch {
      toast.error("Erro ao cancelar aposta.");
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const cancelBet = useCallback(() => cancelBetSlot(1), [cancelBetSlot]);
  const cancelBet2 = useCallback(() => cancelBetSlot(2), [cancelBetSlot]);

  // ─── Cash Out ───
  const cashOutSlot = useCallback(async (slot: 1 | 2) => {
    if (!user) return;
    if (phaseRef.current !== "running") return;
    const betRef = slot === 1 ? currentBetRef : currentBet2Ref;
    if (!betRef.current || betRef.current.cashed_out_at) return;

    setIsProcessing(true);
    try {
      const m = multiplierRef.current;
      const payout = betRef.current.bet_amount * m;

      await supabase.from("aviator_bets").update({ cashed_out_at: m, payout }).eq("id", betRef.current.id);
      const newBalance = balanceRef.current + payout;
      await supabase.from("double_balances").update({ balance: newBalance }).eq("user_id", user.id);
      setBalance(newBalance);

      const updatedBet = { ...betRef.current, cashed_out_at: m, payout };
      if (slot === 1) { setCurrentBet(updatedBet); currentBetRef.current = updatedBet; }
      else { setCurrentBet2(updatedBet); currentBet2Ref.current = updatedBet; }

      updateStats(true, updatedBet.bet_amount, payout, m);
      toast.success(`Aposta ${slot}: Retirou em ${m.toFixed(2)}x! Ganhou R$ ${payout.toFixed(2)}`);
    } catch {
      toast.error("Erro ao retirar.");
    } finally {
      setIsProcessing(false);
    }
  }, [user, updateStats]);

  const cashOut = useCallback(() => cashOutSlot(1), [cashOutSlot]);
  const cashOut2 = useCallback(() => cashOutSlot(2), [cashOutSlot]);

  const sessionDuration = useMemo(() => {
    return Math.floor((Date.now() - sessionStats.sessionStart) / 60000);
  }, [sessionStats.sessionStart, sessionStats.roundsPlayed]);

  return {
    phase, multiplier, crashPoint, lastCrash, crashHistory,
    waitCountdown, balance, currentBet, currentBet2, roundBets,
    isProcessing, sessionStats, sessionDuration, betHistory,
    placeBet, placeBet2, cancelBet, cancelBet2, cashOut, cashOut2, loadBalance,
  };
}
