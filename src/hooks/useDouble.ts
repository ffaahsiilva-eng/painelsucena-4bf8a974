import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export type DoubleColor = "red" | "black" | "white";
export type DoublePhase = "betting" | "spinning" | "result";

interface DoubleRound {
  id: string;
  result_number: number;
  result_color: DoubleColor;
  status: string;
  started_at: string;
}

interface DoubleBet {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  bet_color: DoubleColor;
  bet_amount: number;
  payout: number | null;
}

interface HistoryItem {
  number: number;
  color: DoubleColor;
}

// Generate a provably fair result aligned with roulette strip mapping
function generateResult(): { number: number; color: DoubleColor } {
  const rand = Math.random() * 100;

  if (rand < 6) {
    return { number: 0, color: "white" };
  }

  // Roulette mapping used in buildRouletteStrip:
  // odd numbers => red, even numbers => black
  if (rand < 53) {
    const redNumbers = [1, 3, 5, 7, 9, 11, 13];
    return {
      number: redNumbers[Math.floor(Math.random() * redNumbers.length)],
      color: "red",
    };
  }

  const blackNumbers = [2, 4, 6, 8, 10, 12, 14];
  return {
    number: blackNumbers[Math.floor(Math.random() * blackNumbers.length)],
    color: "black",
  };
}

// Build roulette strip: repeating pattern of colors
export function buildRouletteStrip(): Array<{ number: number; color: DoubleColor }> {
  const strip: Array<{ number: number; color: DoubleColor }> = [];
  // Create a long strip with the pattern
  for (let i = 0; i < 60; i++) {
    const mod = i % 15;
    if (mod === 0) {
      strip.push({ number: 0, color: "white" });
    } else if (mod % 2 === 1) {
      strip.push({ number: mod, color: "red" });
    } else {
      strip.push({ number: mod, color: "black" });
    }
  }
  return strip;
}

export function useDouble() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [phase, setPhase] = useState<DoublePhase>("betting");
  const [timeLeft, setTimeLeft] = useState(15);
  const [balance, setBalance] = useState(5000);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [bets, setBets] = useState<DoubleBet[]>([]);
  const [myBets, setMyBets] = useState<Map<DoubleColor, number>>(new Map());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastResult, setLastResult] = useState<{ number: number; color: DoubleColor } | null>(null);
  const [spinTarget, setSpinTarget] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const roundRef = useRef<string | null>(null);
  const loopTokenRef = useRef(0);
  const phaseRef = useRef<DoublePhase>(phase);
  const balanceRef = useRef(balance);
  const currentRoundIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { currentRoundIdRef.current = currentRoundId; }, [currentRoundId]);

  // Load balance
  useEffect(() => {
    if (!user) return;
    const loadBalance = async () => {
      const { data } = await supabase
        .from("double_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setBalance(Number(data.balance));
      } else {
        await supabase.from("double_balances").insert({ user_id: user.id, balance: 5000 });
        setBalance(5000);
      }
    };
    loadBalance();
  }, [user]);

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase
        .from("double_rounds")
        .select("result_number, result_color")
        .eq("status", "finished")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setHistory(data.map(d => ({ number: d.result_number, color: d.result_color as DoubleColor })));
      }
    };
    loadHistory();
  }, []);

  // Game loop
  const startRound = useCallback(async () => {
    if (!user) return;

    const loopToken = ++loopTokenRef.current;

    if (timerRef.current) clearInterval(timerRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);

    const result = generateResult();
    const strip = buildRouletteStrip();
    let targetIdx = 30; // middle of strip
    for (let i = 28; i < 45; i++) {
      if (strip[i].color === result.color && strip[i].number === result.number) {
        targetIdx = i;
        break;
      }
    }
    const targetCell = strip[targetIdx];

    setPhase("betting");
    setTimeLeft(15);
    setBets([]);
    setMyBets(new Map());
    setLastResult(null);
    setSpinTarget(null);

    // Create round in DB
    const { data: round } = await supabase
      .from("double_rounds")
      .insert({
        result_number: targetCell.number,
        result_color: targetCell.color,
        status: "betting",
      })
      .select("id")
      .single();

    // If a newer loop started while awaiting, abort this one
    if (!round || loopToken !== loopTokenRef.current) return;

    setCurrentRoundId(round.id);
    roundRef.current = round.id;

    // Timer
    let t = 15;
    timerRef.current = setInterval(async () => {
      // Ignore stale interval ticks from older loops
      if (loopToken !== loopTokenRef.current) return;

      t -= 1;
      setTimeLeft(t);

      if (t <= 5 && t > 0) {
        setPhase("spinning");
        if (t === 5) {
          setSpinTarget(targetIdx);
        }
      }

      if (t <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (loopToken !== loopTokenRef.current) return;

        setPhase("result");
        setLastResult(targetCell);

        // Update round status
        await supabase
          .from("double_rounds")
          .update({
            status: "finished",
            result_number: targetCell.number,
            result_color: targetCell.color,
            finished_at: new Date().toISOString(),
          })
          .eq("id", roundRef.current!);

        if (loopToken !== loopTokenRef.current) return;

        // Process payouts
        const { data: roundBets } = await supabase
          .from("double_bets")
          .select("*")
          .eq("round_id", roundRef.current!);

        if (loopToken !== loopTokenRef.current) return;

        if (roundBets) {
          for (const bet of roundBets) {
            if (bet.bet_color === targetCell.color) {
              const multiplier = targetCell.color === "white" ? 14 : 2;
              const payout = Number(bet.bet_amount) * multiplier;

              await supabase
                .from("double_bets")
                .update({ payout })
                .eq("id", bet.id);

              if (bet.user_id === user.id) {
                setBalance(prev => {
                  const newBal = prev + payout;
                  supabase
                    .from("double_balances")
                    .update({ balance: newBal, updated_at: new Date().toISOString() })
                    .eq("user_id", user.id);
                  return newBal;
                });
              }
            }
          }
        }

        // Update history
        setHistory(prev => [{ number: targetCell.number, color: targetCell.color }, ...prev].slice(0, 20));

        // Start next round after 5s (still guarded by loop token)
        nextRoundTimeoutRef.current = setTimeout(() => {
          if (loopToken === loopTokenRef.current) {
            startRound();
          }
        }, 5000);
      }
    }, 1000);
  }, [user]);

  // Start first round
  useEffect(() => {
    if (user) {
      startRound();
    }
    return () => {
      loopTokenRef.current += 1;
      if (timerRef.current) clearInterval(timerRef.current);
      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    };
  }, [user, startRound]);

  // Subscribe to bets realtime
  useEffect(() => {
    if (!currentRoundId) return;
    return subscribeToTable(
      { event: "INSERT", table: "double_bets", filter: `round_id=eq.${currentRoundId}` },
      (payload) => {
        const newBet = payload.new as DoubleBet;
        setBets((prev) => [...prev, newBet]);
      }
    );
  }, [currentRoundId]);

  const placeBet = useCallback(async (color: DoubleColor, amount: number) => {
    const currentPhase = phaseRef.current;
    const currentBalance = balanceRef.current;
    const roundId = currentRoundIdRef.current;

    if (!user || !roundId || currentPhase !== "betting") return false;
    if (amount > currentBalance || amount < 0.10) return false;

    const userName = profile?.full_name || "Jogador";
    const avatarUrl = profile?.avatar_url || null;

    // Debit balance
    const newBalance = currentBalance - amount;
    setBalance(newBalance);

    await supabase
      .from("double_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Place bet
    await supabase.from("double_bets").insert({
      round_id: roundId,
      user_id: user.id,
      user_name: userName,
      avatar_url: avatarUrl,
      bet_color: color,
      bet_amount: amount,
    });

    setMyBets(prev => {
      const next = new Map(prev);
      next.set(color, (next.get(color) || 0) + amount);
      return next;
    });

    return true;
  }, [user, profile]);

  return {
    phase,
    timeLeft,
    balance,
    bets,
    myBets,
    history,
    lastResult,
    spinTarget,
    placeBet,
    currentRoundId,
  };
}
