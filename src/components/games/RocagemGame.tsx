import { useState, useCallback, useEffect, useRef } from "react";
import { useSaveGameScore } from "@/hooks/useGameScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Star, Check, X, Timer, Zap, ArrowLeft, Heart, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RocagemQuestion {
  id: string;
  scenario: string;
  emoji: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: "seguranca" | "tecnica" | "equipamento" | "manutencao";
}

const ALL_QUESTIONS: RocagemQuestion[] = [
  {
    id: "r1", category: "seguranca", emoji: "🦺",
    scenario: "Qual é a distância mínima de segurança que outras pessoas devem manter de quem está roçando?",
    options: ["5 metros", "10 metros", "15 metros", "3 metros"],
    correctIndex: 2,
    explanation: "A distância mínima recomendada é de 15 metros para evitar que pedras e detritos atinjam outras pessoas."
  },
  {
    id: "r2", category: "equipamento", emoji: "⚙️",
    scenario: "Qual EPI é ESPECÍFICO e obrigatório para operação de roçadeira?",
    options: ["Luva de látex", "Perneira anticorte", "Óculos de sol", "Colete salva-vidas"],
    correctIndex: 1,
    explanation: "A perneira anticorte protege as pernas contra cortes acidentais da lâmina ou fio de nylon."
  },
  {
    id: "r3", category: "tecnica", emoji: "🌿",
    scenario: "Qual é o movimento correto da roçadeira durante o corte?",
    options: ["De baixo para cima", "Da direita para a esquerda (pendular)", "Em círculos", "Empurrando para frente"],
    correctIndex: 1,
    explanation: "O movimento pendular (da direita para a esquerda) aproveita o sentido de rotação da lâmina e projeta o material cortado para o lado já roçado."
  },
  {
    id: "r4", category: "manutencao", emoji: "🔧",
    scenario: "Com que frequência a lâmina/fio de nylon da roçadeira deve ser verificado?",
    options: ["Uma vez por semana", "Antes de cada uso", "Uma vez por mês", "Apenas quando quebrar"],
    correctIndex: 1,
    explanation: "A inspeção antes de cada uso garante que a lâmina está afiada, sem trincas e o fio de nylon está com comprimento adequado."
  },
  {
    id: "r5", category: "seguranca", emoji: "⛽",
    scenario: "Qual o procedimento correto para abastecer a roçadeira?",
    options: ["Com o motor ligado para não perder tempo", "Com o motor desligado e frio", "Enquanto outra pessoa segura a máquina ligada", "Apenas quando acabar totalmente o combustível"],
    correctIndex: 1,
    explanation: "O abastecimento deve ser feito com o motor desligado e frio para evitar risco de incêndio."
  },
  {
    id: "r6", category: "tecnica", emoji: "📐",
    scenario: "Qual a altura ideal de corte para manutenção de áreas verdes em taludes?",
    options: ["Rente ao solo", "Entre 5 e 10 cm do solo", "Acima de 30 cm", "Não importa a altura"],
    correctIndex: 1,
    explanation: "Manter 5-10 cm protege o solo contra erosão, preserva as raízes e facilita a rebrota saudável da vegetação."
  },
  {
    id: "r7", category: "equipamento", emoji: "🎧",
    scenario: "Qual o nível de ruído aproximado de uma roçadeira e o EPI necessário?",
    options: ["50 dB - Nenhum EPI auditivo", "70 dB - Tampão simples", "95-110 dB - Protetor auricular tipo concha", "40 dB - Apenas se incomodar"],
    correctIndex: 2,
    explanation: "Roçadeiras produzem entre 95-110 dB, exigindo protetor auricular tipo concha para prevenir perda auditiva."
  },
  {
    id: "r8", category: "seguranca", emoji: "🐍",
    scenario: "Ao encontrar um animal peçonhento durante a roçagem, qual o procedimento correto?",
    options: ["Tentar afugentar com a roçadeira", "Parar imediatamente e acionar o CCO", "Continuar roçando normalmente", "Capturar o animal"],
    correctIndex: 1,
    explanation: "Deve-se parar a atividade imediatamente, manter distância segura e acionar o CCO (Centro de Controle Operacional) para providências adequadas."
  },
  {
    id: "r9", category: "manutencao", emoji: "🔩",
    scenario: "Antes de iniciar a roçagem, o que deve ser verificado na proteção (carenagem) da roçadeira?",
    options: ["Pode ser removida para cortar melhor", "Deve estar fixada, sem trincas e sem folgas", "É opcional em áreas abertas", "Só é necessária para lâminas de aço"],
    correctIndex: 1,
    explanation: "A carenagem de proteção é OBRIGATÓRIA e deve estar íntegra para proteger o operador contra projeção de materiais."
  },
  {
    id: "r10", category: "tecnica", emoji: "⛰️",
    scenario: "Em terrenos inclinados (taludes), qual o sentido correto de roçar?",
    options: ["De cima para baixo", "Em linha horizontal, de uma extremidade à outra", "De baixo para cima", "Tanto faz o sentido"],
    correctIndex: 1,
    explanation: "Roçar em faixas horizontais (seguindo as curvas de nível) oferece maior estabilidade ao operador e melhor controle do equipamento."
  },
  {
    id: "r11", category: "seguranca", emoji: "☀️",
    scenario: "Em dias de calor extremo, qual cuidado adicional o operador de roçadeira deve ter?",
    options: ["Trabalhar mais rápido para terminar logo", "Fazer pausas regulares para hidratação e descanso à sombra", "Remover EPIs para refrescar", "Não há cuidados especiais"],
    correctIndex: 1,
    explanation: "Pausas para hidratação e descanso à sombra previnem insolação e exaustão térmica, mantendo a segurança do operador."
  },
  {
    id: "r12", category: "equipamento", emoji: "👓",
    scenario: "Qual tipo de proteção facial é necessária durante a roçagem?",
    options: ["Óculos de sol comuns", "Viseira facial ou óculos de proteção com vedação lateral", "Nenhuma, a carenagem já protege", "Máscara de solda"],
    correctIndex: 1,
    explanation: "A viseira facial ou óculos com vedação lateral protegem contra projeção de pedras, galhos e detritos nos olhos e face."
  },
  {
    id: "r13", category: "manutencao", emoji: "🛠️",
    scenario: "Qual a ação correta ao perceber vibração excessiva na roçadeira?",
    options: ["Continuar trabalhando, é normal", "Parar imediatamente e verificar lâmina, fixação e eixo", "Aumentar a rotação para compensar", "Trocar apenas o fio de nylon"],
    correctIndex: 1,
    explanation: "Vibração excessiva pode indicar lâmina desbalanceada, solta ou eixo danificado - riscos graves de acidente."
  },
  {
    id: "r14", category: "tecnica", emoji: "🌱",
    scenario: "Qual tipo de vegetação NÃO deve ser roçada sem autorização específica?",
    options: ["Capim-colonião", "Braquiária", "Mudas de espécies nativas em área de recuperação", "Tiririca"],
    correctIndex: 2,
    explanation: "Mudas de espécies nativas em áreas de recuperação ambiental são protegidas e só devem ser manejadas com autorização."
  },
  {
    id: "r15", category: "seguranca", emoji: "⚡",
    scenario: "Qual o risco principal ao roçar próximo a fiações ou cercas elétricas?",
    options: ["Desgaste da lâmina", "Choque elétrico por contato do equipamento com fios", "Excesso de barulho", "Não há risco"],
    correctIndex: 1,
    explanation: "O contato da lâmina metálica com fiações pode causar choque elétrico fatal. Deve-se manter distância e usar fio de nylon nessas áreas."
  },
  {
    id: "r16", category: "equipamento", emoji: "🪖",
    scenario: "Qual é o conjunto COMPLETO de EPIs para operação de roçadeira?",
    options: ["Apenas capacete e botina", "Capacete, viseira, protetor auricular, luvas, perneira e botina", "Colete e óculos escuros", "Luvas e botas de borracha"],
    correctIndex: 1,
    explanation: "O conjunto completo inclui: capacete com viseira facial, protetor auricular, luvas anticorte, perneira anticorte e botina de segurança."
  },
  {
    id: "r17", category: "manutencao", emoji: "🔋",
    scenario: "Como deve ser guardada a roçadeira após o uso?",
    options: ["Com combustível e suja, pronta para o dia seguinte", "Limpa, sem combustível, com proteção na lâmina, em local coberto", "No chão, em qualquer posição", "Pendurada pela lâmina"],
    correctIndex: 1,
    explanation: "A roçadeira deve ser limpa, esvaziada, com protetor de lâmina e armazenada em local seco e coberto para preservar o equipamento."
  },
  {
    id: "r18", category: "tecnica", emoji: "🎯",
    scenario: "Qual a vantagem de usar fio de nylon ao invés de lâmina de aço?",
    options: ["Corta mais rápido", "Menor risco de projeção de pedras e seguro próximo a estruturas", "É mais durável", "Não há vantagem"],
    correctIndex: 1,
    explanation: "O fio de nylon é mais seguro próximo a cercas, muros e estruturas, pois reduz projeção de fragmentos e não danifica superfícies."
  },
  // Novas perguntas
  {
    id: "r19", category: "seguranca", emoji: "🚫",
    scenario: "É permitido operar a roçadeira sem a carenagem de proteção?",
    options: ["Sim, em áreas abertas", "Não, a carenagem é obrigatória em todas as situações", "Sim, se estiver usando viseira", "Depende do tipo de vegetação"],
    correctIndex: 1,
    explanation: "A carenagem de proteção é SEMPRE obrigatória, independente do local ou tipo de vegetação, para evitar projeção de materiais."
  },
  {
    id: "r20", category: "tecnica", emoji: "🔄",
    scenario: "Qual a rotação ideal (RPM) para o corte eficiente com roçadeira?",
    options: ["Sempre na rotação máxima", "Rotação média a alta, ajustada conforme a vegetação", "Sempre na rotação mínima", "Não importa a rotação"],
    correctIndex: 1,
    explanation: "A rotação deve ser ajustada conforme o tipo de vegetação: média para capim fino, alta para vegetação densa, evitando sobrecarga do motor."
  },
  {
    id: "r21", category: "seguranca", emoji: "🌫️",
    scenario: "Em condições de neblina ou baixa visibilidade, qual a medida correta?",
    options: ["Continuar normalmente", "Suspender a atividade até melhorar a visibilidade", "Usar lanterna", "Roçar mais devagar"],
    correctIndex: 1,
    explanation: "Em condições de baixa visibilidade, a atividade deve ser suspensa para evitar acidentes com pedestres e veículos próximos."
  },
  {
    id: "r22", category: "manutencao", emoji: "⛽",
    scenario: "Qual a proporção correta de mistura combustível para roçadeiras 2 tempos?",
    options: ["Gasolina pura", "Mistura de gasolina e óleo 2T conforme manual do fabricante", "Diesel e gasolina", "Álcool puro"],
    correctIndex: 1,
    explanation: "Roçadeiras 2 tempos exigem mistura de gasolina com óleo 2T na proporção indicada pelo fabricante (geralmente 1:25 ou 1:50)."
  },
  {
    id: "r23", category: "equipamento", emoji: "🧰",
    scenario: "O que deve conter o kit de ferramentas levado ao campo junto com a roçadeira?",
    options: ["Apenas combustível", "Chave de vela, chave Allen, fio reserva, Lima para afiação", "Apenas fio de nylon", "Nenhuma ferramenta é necessária"],
    correctIndex: 1,
    explanation: "Um kit completo permite manutenções básicas em campo: troca de vela, ajuste da lâmina, reposição de fio e afiação rápida."
  },
  {
    id: "r24", category: "tecnica", emoji: "🌾",
    scenario: "Ao roçar capim alto e denso, qual técnica é mais eficiente?",
    options: ["Cortar tudo de uma vez rente ao solo", "Fazer dois passes: primeiro mais alto, depois na altura desejada", "Usar sempre lâmina de 3 pontas", "Aumentar a velocidade de caminhada"],
    correctIndex: 1,
    explanation: "Em vegetação alta e densa, o duplo passe evita embuchamento, reduz esforço do motor e proporciona corte mais uniforme."
  },
  {
    id: "r25", category: "seguranca", emoji: "🚗",
    scenario: "Ao roçar próximo a vias de tráfego, qual medida de segurança é obrigatória?",
    options: ["Nenhuma especial", "Sinalização da área com cones e uso de colete refletivo", "Apenas usar capacete", "Roçar de costas para a via"],
    correctIndex: 1,
    explanation: "É obrigatório sinalizar a área com cones, fitas e usar colete refletivo para alertar motoristas sobre a presença de trabalhadores."
  },
  {
    id: "r26", category: "manutencao", emoji: "🔥",
    scenario: "O que fazer quando a roçadeira apresenta dificuldade para ligar?",
    options: ["Puxar o starter com força excessiva", "Verificar vela, filtro de ar, combustível e afogador", "Bater na máquina", "Usar gasolina pura para facilitar"],
    correctIndex: 1,
    explanation: "A checklist de partida inclui: verificar vela (limpa/seca), filtro de ar (desobstruído), combustível (fresco) e posição do afogador."
  },
  {
    id: "r27", category: "tecnica", emoji: "🏞️",
    scenario: "Em áreas com presença de pedras, qual o cuidado principal?",
    options: ["Roçar normalmente", "Reduzir a rotação e usar fio de nylon ao invés de lâmina", "Usar lâmina de aço reforçada", "Ignorar as pedras"],
    correctIndex: 1,
    explanation: "Em áreas pedregosas, o fio de nylon reduz o risco de projeção de fragmentos perigosos. A rotação deve ser reduzida próximo a pedras."
  },
  {
    id: "r28", category: "seguranca", emoji: "⛈️",
    scenario: "É permitido operar roçadeira durante tempestade com raios?",
    options: ["Sim, se usar EPIs", "Não, deve-se suspender a atividade imediatamente", "Sim, se estiver em área aberta", "Sim, se a roçadeira for elétrica"],
    correctIndex: 1,
    explanation: "Em tempestades com raios, toda atividade ao ar livre deve ser suspensa imediatamente. Equipamentos metálicos atraem descargas elétricas."
  },
  {
    id: "r29", category: "equipamento", emoji: "🪒",
    scenario: "Quando se deve trocar a lâmina de corte da roçadeira?",
    options: ["Apenas quando quebrar", "Quando apresentar desgaste, trincas ou desbalanceamento", "Uma vez por ano", "Nunca, basta afiar"],
    correctIndex: 1,
    explanation: "Lâminas com desgaste excessivo, trincas ou desbalanceamento devem ser substituídas imediatamente para evitar acidentes."
  },
  {
    id: "r30", category: "tecnica", emoji: "📱",
    scenario: "É permitido usar fones de ouvido para ouvir música durante a operação de roçadeira?",
    options: ["Sim, para tornar o trabalho mais agradável", "Não, o operador precisa ouvir sons do ambiente e da máquina", "Sim, se for só um lado", "Sim, desde que com volume baixo"],
    correctIndex: 1,
    explanation: "Fones de ouvido impedem a percepção de alertas, aproximação de pessoas/veículos e sons anormais do equipamento. Use apenas protetor auricular."
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  seguranca: { label: "Segurança", color: "text-red-500" },
  tecnica: { label: "Técnica", color: "text-green-500" },
  equipamento: { label: "Equipamento", color: "text-blue-500" },
  manutencao: { label: "Manutenção", color: "text-amber-500" },
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const ROUND_SIZE = 10;
const TIME_PER_QUESTION = 60;

export function RocagemGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [questions, setQuestions] = useState<RocagemQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string; chosenIndex: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [answers, setAnswers] = useState<{ question: RocagemQuestion; chosenIndex: number; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveScore = useSaveGameScore();
  const scoreSavedRef = useRef(false);
  const playedIdsRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const answersRef = useRef<{ question: RocagemQuestion; chosenIndex: number; correct: boolean }[]>([]);
  const bestStreakRef = useRef(0);

  scoreRef.current = score;
  answersRef.current = answers;
  bestStreakRef.current = bestStreak;

  const currentQuestion = questions[currentIndex] || null;
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  const startGame = useCallback(() => {
    scoreSavedRef.current = false;
    let available = ALL_QUESTIONS.filter(q => !playedIdsRef.current.has(q.id));
    if (available.length < ROUND_SIZE) {
      playedIdsRef.current.clear();
      available = [...ALL_QUESTIONS];
    }
    const selected = shuffleArray(available).slice(0, ROUND_SIZE).map(q => {
      const correctAnswer = q.options[q.correctIndex];
      const shuffledOptions = shuffleArray([...q.options]);
      return { ...q, options: shuffledOptions, correctIndex: shuffledOptions.indexOf(correctAnswer) };
    });
    selected.forEach(q => playedIdsRef.current.add(q.id));
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setFeedback(null);
    setTimeLeft(TIME_PER_QUESTION);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(-1);
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, feedback, currentIndex]);

  const handleAnswer = useCallback((chosenIndex: number) => {
    if (!currentQuestion || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isTimeout = chosenIndex === -1;
    const correct = !isTimeout && chosenIndex === currentQuestion.correctIndex;
    let points = 0;
    let newStreak = streak;
    let newLives = lives;

    if (correct) {
      points = 10 + Math.floor(timeLeft);
      newStreak = streak + 1;
    } else {
      newStreak = 0;
      newLives = lives - 1;
    }

    setScore((prev) => prev + points);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setLives(newLives);
    setFeedback({ correct, explanation: currentQuestion.explanation, chosenIndex: isTimeout ? -1 : chosenIndex });
    setAnswers((prev) => [...prev, { question: currentQuestion, chosenIndex: isTimeout ? -1 : chosenIndex, correct }]);

    setTimeout(() => {
      setFeedback(null);
      setTimeLeft(TIME_PER_QUESTION);
      if (newLives <= 0 || currentIndex + 1 >= questions.length) {
        setGameState("finished");
        if (!scoreSavedRef.current) {
          scoreSavedRef.current = true;
          const finalAnswers = [...answersRef.current, { question: currentQuestion, chosenIndex: isTimeout ? -1 : chosenIndex, correct }];
          const correctCount = finalAnswers.filter(a => a.correct).length;
          const finalScore = scoreRef.current + points;
          const finalBestStreak = Math.max(bestStreakRef.current, newStreak);
          saveScore.mutate({ gameId: "rocagem", score: finalScore, correctAnswers: correctCount, totalQuestions: finalAnswers.length, bestStreak: finalBestStreak });
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 2500);
  }, [currentQuestion, feedback, streak, bestStreak, timeLeft, currentIndex, questions.length, lives]);

  const getStarRating = () => {
    const correctCount = answers.filter(a => a.correct).length;
    const pct = (correctCount / answers.length) * 100;
    if (pct >= 80) return 3;
    if (pct >= 50) return 2;
    if (pct >= 25) return 1;
    return 0;
  };

  const timeBarPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timeColor = timeLeft <= 3 ? "bg-red-500" : timeLeft <= 7 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Games
      </Button>

      {gameState === "idle" && (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-6 md:p-10 text-center space-y-6">
            <div className="text-6xl md:text-8xl">🌾</div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Quiz de Roçagem</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Teste seus conhecimentos sobre segurança, técnicas e manutenção na operação de roçadeira! Você tem 3 vidas.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(CATEGORY_LABELS).map(([key, cat]) => (
                <div key={key} className="p-3 rounded-xl border border-border bg-muted/30">
                  <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span className="text-sm ml-2">3 vidas</span>
            </div>
            <Button onClick={startGame} size="lg" className="gap-2 text-base px-8">
              <Zap className="w-5 h-5" /> Iniciar Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === "playing" && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-sm"><Trophy className="w-3.5 h-3.5" /> {score} pts</Badge>
            {streak > 1 && <Badge className="gap-1 text-sm bg-amber-500/90 text-white">🔥 {streak}x</Badge>}
            <div className="flex-1" />
            <div className="flex gap-0.5">
              {[1, 2, 3].map((l) => (
                <Heart key={l} className={`w-4 h-4 transition-all ${l <= lives ? "text-red-500 fill-red-500" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
          </div>

          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timeColor} rounded-full`}
              initial={{ width: "100%" }}
              animate={{ width: `${timeBarPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <Card className="border-2 border-border">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs ${CATEGORY_LABELS[currentQuestion.category].color}`}>
                      {CATEGORY_LABELS[currentQuestion.category].label}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{currentQuestion.emoji}</span>
                    <p className="text-base font-medium text-foreground leading-snug pt-1">{currentQuestion.scenario}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="grid gap-2">
            {currentQuestion.options.map((option, idx) => {
              let optionClass = "border-border hover:border-primary/50 hover:bg-primary/5";
              if (feedback) {
                if (idx === currentQuestion.correctIndex) {
                  optionClass = "border-green-500 bg-green-500/10";
                } else if (idx === feedback.chosenIndex && !feedback.correct) {
                  optionClass = "border-red-500 bg-red-500/10";
                }
              }
              return (
                <motion.button
                  key={idx}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${optionClass}`}
                  whileTap={!feedback ? { scale: 0.97 } : {}}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-foreground">{option}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className={`border-2 ${feedback.correct ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {feedback.correct ? <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> : <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm text-foreground">{feedback.explanation}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {gameState === "finished" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">🌾</div>
              <CardTitle className="text-2xl">Fim do Quiz!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3].map((star) => (
                  <Star key={star} className={`w-8 h-8 ${star <= getStarRating() ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{score}</div><div className="text-xs text-muted-foreground">Pontos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-green-600">{answers.filter(a => a.correct).length}/{answers.length}</div><div className="text-xs text-muted-foreground">Acertos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-amber-500">{bestStreak}x</div><div className="text-xs text-muted-foreground">Melhor Combo</div></div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Resumo das Respostas</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {answers.map((answer, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${answer.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {answer.correct ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-base">{answer.question.emoji}</span>
                      <span className="flex-1 truncate text-foreground text-xs">{answer.question.scenario.slice(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Leaf className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Dica de Segurança</p>
                    <p className="text-xs text-muted-foreground">Sempre inspecione o equipamento antes do uso e nunca opere a roçadeira sem os EPIs completos. A segurança começa antes de ligar a máquina!</p>
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
