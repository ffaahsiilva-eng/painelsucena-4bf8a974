import { useState, useCallback, useEffect, useRef } from "react";
import { useSaveGameScore } from "@/hooks/useGameScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, RotateCcw, Star, Check, X, Timer, Leaf, Zap, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WasteItem {
  id: string;
  name: string;
  emoji: string;
  correctBin: BinType;
  hint: string;
}

type BinType = "reciclavel" | "organico" | "rejeito" | "perigoso";

interface Bin {
  type: BinType;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  emoji: string;
}

const BINS: Bin[] = [
  { type: "reciclavel", label: "Reciclável", color: "#3B82F6", bgClass: "bg-blue-500/15 dark:bg-blue-500/20", borderClass: "border-blue-500", emoji: "♻️" },
  { type: "organico", label: "Orgânico", color: "#22C55E", bgClass: "bg-green-500/15 dark:bg-green-500/20", borderClass: "border-green-500", emoji: "🌿" },
  { type: "rejeito", label: "Rejeito", color: "#6B7280", bgClass: "bg-gray-500/15 dark:bg-gray-500/20", borderClass: "border-gray-500", emoji: "🗑️" },
  { type: "perigoso", label: "Perigoso", color: "#EF4444", bgClass: "bg-red-500/15 dark:bg-red-500/20", borderClass: "border-red-500", emoji: "☢️" },
];

const ALL_WASTE_ITEMS: WasteItem[] = [
  { id: "garrafa-pet", name: "Garrafa PET", emoji: "🧴", correctBin: "reciclavel", hint: "Plástico reciclável" },
  { id: "lata-aluminio", name: "Lata de Alumínio", emoji: "🥫", correctBin: "reciclavel", hint: "Metal reciclável" },
  { id: "papelao", name: "Papelão", emoji: "📦", correctBin: "reciclavel", hint: "Papel e papelão são recicláveis" },
  { id: "jornal", name: "Jornal", emoji: "📰", correctBin: "reciclavel", hint: "Papel limpo é reciclável" },
  { id: "vidro", name: "Garrafa de Vidro", emoji: "🍾", correctBin: "reciclavel", hint: "Vidro é reciclável" },
  { id: "embalagem-metal", name: "Lata de Conserva", emoji: "🥫", correctBin: "reciclavel", hint: "Metal reciclável" },
  { id: "plastico-duro", name: "Balde Plástico", emoji: "🪣", correctBin: "reciclavel", hint: "Plástico rígido é reciclável" },
  { id: "casca-banana", name: "Casca de Banana", emoji: "🍌", correctBin: "organico", hint: "Restos de alimentos são orgânicos" },
  { id: "borra-cafe", name: "Borra de Café", emoji: "☕", correctBin: "organico", hint: "Resíduo orgânico compostável" },
  { id: "folhas", name: "Folhas Secas", emoji: "🍂", correctBin: "organico", hint: "Material vegetal é orgânico" },
  { id: "casca-ovo", name: "Casca de Ovo", emoji: "🥚", correctBin: "organico", hint: "Compostável" },
  { id: "restos-comida", name: "Restos de Comida", emoji: "🍽️", correctBin: "organico", hint: "Alimentos vão no orgânico" },
  { id: "fruta-podre", name: "Fruta Estragada", emoji: "🍎", correctBin: "organico", hint: "Matéria orgânica" },
  { id: "fralda", name: "Fralda Descartável", emoji: "🧷", correctBin: "rejeito", hint: "Não reciclável e contaminado" },
  { id: "papel-higienico", name: "Papel Higiênico", emoji: "🧻", correctBin: "rejeito", hint: "Contaminado, não reciclável" },
  { id: "esponja", name: "Esponja Usada", emoji: "🧽", correctBin: "rejeito", hint: "Material não reciclável" },
  { id: "ceramica", name: "Cerâmica Quebrada", emoji: "🏺", correctBin: "rejeito", hint: "Não é reciclável" },
  { id: "bituca", name: "Bituca de Cigarro", emoji: "🚬", correctBin: "rejeito", hint: "Contaminante, vai para rejeito" },
  { id: "pilha", name: "Pilha", emoji: "🔋", correctBin: "perigoso", hint: "Contém metais pesados" },
  { id: "lampada", name: "Lâmpada Fluorescente", emoji: "💡", correctBin: "perigoso", hint: "Contém mercúrio" },
  { id: "tinta", name: "Lata de Tinta", emoji: "🎨", correctBin: "perigoso", hint: "Produto químico perigoso" },
  { id: "remedio", name: "Remédio Vencido", emoji: "💊", correctBin: "perigoso", hint: "Descarte especial obrigatório" },
  { id: "oleo-motor", name: "Óleo de Motor", emoji: "🛢️", correctBin: "perigoso", hint: "Contaminante ambiental" },
  { id: "spray", name: "Aerossol/Spray", emoji: "🧯", correctBin: "perigoso", hint: "Inflamável e químico" },
  // Novos itens
  { id: "sacola-plastica", name: "Sacola Plástica", emoji: "🛍️", correctBin: "reciclavel", hint: "Plástico filme é reciclável" },
  { id: "revista", name: "Revista", emoji: "📕", correctBin: "reciclavel", hint: "Papel é reciclável" },
  { id: "copo-vidro", name: "Copo de Vidro", emoji: "🥃", correctBin: "reciclavel", hint: "Vidro é reciclável" },
  { id: "lata-spray-vazia", name: "Lata de Spray Vazia", emoji: "🫙", correctBin: "reciclavel", hint: "Metal reciclável quando vazio e limpo" },
  { id: "embalagem-leite", name: "Caixa de Leite", emoji: "🥛", correctBin: "reciclavel", hint: "Embalagem longa vida é reciclável" },
  { id: "grama-cortada", name: "Grama Cortada", emoji: "🌿", correctBin: "organico", hint: "Matéria vegetal é orgânica" },
  { id: "casca-laranja", name: "Casca de Laranja", emoji: "🍊", correctBin: "organico", hint: "Restos de frutas são orgânicos" },
  { id: "galhos", name: "Galhos e Podas", emoji: "🪵", correctBin: "organico", hint: "Material vegetal é orgânico" },
  { id: "saco-cimento", name: "Saco de Cimento Vazio", emoji: "🧱", correctBin: "rejeito", hint: "Contaminado com resíduos de cimento" },
  { id: "fita-adesiva", name: "Fita Adesiva", emoji: "📎", correctBin: "rejeito", hint: "Material composto, não reciclável" },
  { id: "isopor", name: "Isopor Sujo", emoji: "📦", correctBin: "rejeito", hint: "Isopor contaminado é rejeito" },
  { id: "bateria-carro", name: "Bateria de Carro", emoji: "🔌", correctBin: "perigoso", hint: "Contém ácido e chumbo" },
  { id: "oleo-cozinha", name: "Óleo de Cozinha Usado", emoji: "🫗", correctBin: "perigoso", hint: "Contaminante se descartado incorretamente" },
  { id: "solvente", name: "Solvente/Thinner", emoji: "⚗️", correctBin: "perigoso", hint: "Produto químico inflamável" },
  { id: "pneu-velho", name: "Pneu Velho", emoji: "⭕", correctBin: "rejeito", hint: "Descarte especial, logística reversa" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const ROUND_SIZE = 10;
const TIME_PER_ITEM = 60;

export function RecyclingGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [items, setItems] = useState<WasteItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ITEM);
  const [totalTime, setTotalTime] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<{ item: WasteItem; chosen: BinType; correct: boolean }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveScore = useSaveGameScore();
  const scoreSavedRef = useRef(false);
  const playedIdsRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const answersRef = useRef<{ item: WasteItem; chosen: BinType; correct: boolean }[]>([]);
  const bestStreakRef = useRef(0);

  // Keep refs in sync
  scoreRef.current = score;
  answersRef.current = answers;
  bestStreakRef.current = bestStreak;

  const currentItem = items[currentIndex] || null;
  const progress = items.length > 0 ? ((currentIndex) / items.length) * 100 : 0;

  const startGame = useCallback(() => {
    scoreSavedRef.current = false;
    let available = ALL_WASTE_ITEMS.filter(q => !playedIdsRef.current.has(q.id));
    if (available.length < ROUND_SIZE) {
      playedIdsRef.current.clear();
      available = [...ALL_WASTE_ITEMS];
    }
    const selected = shuffleArray(available).slice(0, ROUND_SIZE);
    selected.forEach(q => playedIdsRef.current.add(q.id));
    setItems(selected);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setTimeLeft(TIME_PER_ITEM);
    setTotalTime(0);
    setShowHint(false);
    setAnswers([]);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer("timeout" as BinType);
          return TIME_PER_ITEM;
        }
        return prev - 1;
      });
      setTotalTime((prev) => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, feedback, currentIndex]);

  const handleAnswer = useCallback((chosenBin: BinType | "timeout") => {
    if (!currentItem || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isTimeout = chosenBin === "timeout";
    const correct = !isTimeout && chosenBin === currentItem.correctBin;
    const correctBinLabel = BINS.find(b => b.type === currentItem.correctBin)?.label || "";
    let points = 0;
    let newStreak = streak;
    if (correct) {
      points = 10 + Math.floor(timeLeft * 2) + (streak * 5);
      newStreak = streak + 1;
    } else {
      newStreak = 0;
    }
    const message = isTimeout ? `⏰ Tempo esgotado! Era: ${correctBinLabel}` : correct ? `✅ Correto! +${points} pontos` : `❌ Errado! Era: ${correctBinLabel}`;
    setScore((prev) => prev + points);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setFeedback({ correct, message });
    setAnswers((prev) => [...prev, { item: currentItem, chosen: isTimeout ? currentItem.correctBin : chosenBin, correct }]);
    setTimeout(() => {
      setFeedback(null);
      setShowHint(false);
      setTimeLeft(TIME_PER_ITEM);
      if (currentIndex + 1 >= items.length) {
        setGameState("finished");
        if (!scoreSavedRef.current) {
          scoreSavedRef.current = true;
          const finalAnswers = [...answersRef.current, { item: currentItem, chosen: isTimeout ? currentItem.correctBin : chosenBin, correct }];
          const correctCount = finalAnswers.filter(a => a.correct).length;
          const finalScore = scoreRef.current + points;
          const finalBestStreak = Math.max(bestStreakRef.current, newStreak);
          saveScore.mutate({ gameId: "recycling", score: finalScore, correctAnswers: correctCount, totalQuestions: finalAnswers.length, bestStreak: finalBestStreak });
        }
      } else setCurrentIndex((prev) => prev + 1);
    }, 1500);
  }, [currentItem, feedback, streak, bestStreak, timeLeft, currentIndex, items.length]);

  const getStarRating = () => {
    const pct = (score / (ROUND_SIZE * 30)) * 100;
    if (pct >= 80) return 3;
    if (pct >= 50) return 2;
    if (pct >= 25) return 1;
    return 0;
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Games
      </Button>

      {gameState === "idle" && (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-6 md:p-10 text-center space-y-6">
            <div className="text-6xl md:text-8xl">♻️</div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Coleta Seletiva</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Descarte cada resíduo no coletor correto! Ganhe pontos por acertos rápidos e sequências sem erros.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BINS.map((bin) => (
                <div key={bin.type} className={`p-3 rounded-xl border-2 ${bin.borderClass} ${bin.bgClass}`}>
                  <div className="text-2xl mb-1">{bin.emoji}</div>
                  <span className="text-xs font-semibold" style={{ color: bin.color }}>{bin.label}</span>
                </div>
              ))}
            </div>
            <Button onClick={startGame} size="lg" className="gap-2 text-base px-8">
              <Zap className="w-5 h-5" /> Iniciar Jogo
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === "playing" && currentItem && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-sm"><Trophy className="w-3.5 h-3.5" /> {score} pts</Badge>
            {streak > 1 && <Badge className="gap-1 text-sm bg-amber-500/90 text-white">🔥 {streak}x combo</Badge>}
            <div className="flex-1" />
            <Badge variant="outline" className="gap-1 text-sm"><Timer className="w-3.5 h-3.5" /> {timeLeft}s</Badge>
            <span className="text-xs text-muted-foreground">{currentIndex + 1}/{items.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <AnimatePresence mode="wait">
            <motion.div key={currentItem.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.3 }}>
              <Card className={`border-2 transition-colors ${feedback ? feedback.correct ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5" : "border-border"}`}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-6xl md:text-7xl">{currentItem.emoji}</div>
                  <h3 className="text-xl font-bold text-foreground">{currentItem.name}</h3>
                  {showHint && !feedback && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-muted-foreground italic">💡 {currentItem.hint}</motion.p>
                  )}
                  {feedback && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`text-sm font-semibold ${feedback.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{feedback.message}</motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
          {!showHint && !feedback && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-xs text-muted-foreground">💡 Mostrar dica (-5 pts)</Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {BINS.map((bin) => (
              <Button key={bin.type} variant="outline" disabled={!!feedback} onClick={() => { if (showHint) setScore((prev) => Math.max(0, prev - 5)); handleAnswer(bin.type); }} className={`h-auto py-4 flex flex-col gap-1 border-2 transition-all hover:scale-[1.02] active:scale-95 ${bin.borderClass} ${bin.bgClass}`}>
                <span className="text-2xl">{bin.emoji}</span>
                <span className="text-xs font-bold" style={{ color: bin.color }}>{bin.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {gameState === "finished" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">🏆</div>
              <CardTitle className="text-2xl">Fim de Jogo!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3].map((star) => (
                  <Star key={star} className={`w-8 h-8 ${star <= getStarRating() ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{score}</div><div className="text-xs text-muted-foreground">Pontos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-green-600">{answers.filter(a => a.correct).length}/{ROUND_SIZE}</div><div className="text-xs text-muted-foreground">Acertos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-amber-500">{bestStreak}x</div><div className="text-xs text-muted-foreground">Melhor Combo</div></div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Resumo das Respostas</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {answers.map((answer, i) => {
                    const correctBin = BINS.find(b => b.type === answer.item.correctBin);
                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${answer.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        {answer.correct ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <span className="text-base">{answer.item.emoji}</span>
                        <span className="flex-1 truncate text-foreground">{answer.item.name}</span>
                        {!answer.correct && <span className="text-xs text-muted-foreground">→ {correctBin?.label}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Leaf className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Dica Ambiental</p>
                    <p className="text-xs text-muted-foreground">A separação correta do lixo reduz em até 30% o volume de resíduos em aterros. No canteiro de obras, siga sempre as orientações do PGRS!</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={startGame} className="flex-1 gap-2" size="lg"><RotateCcw className="w-4 h-4" /> Jogar Novamente</Button>
                <Button onClick={onBack} variant="outline" size="lg">Voltar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
