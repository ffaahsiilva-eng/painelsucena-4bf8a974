import { useState, useCallback, useEffect, useRef } from "react";
import { useSaveGameScore } from "@/hooks/useGameScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, RotateCcw, Star, Check, X, Timer, ShieldCheck, Zap, ArrowLeft, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface EPIQuestion {
  id: string;
  scenario: string;
  emoji: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: "identificacao" | "uso_correto" | "situacional" | "norma";
}

// ── Question Bank ──
const ALL_QUESTIONS: EPIQuestion[] = [
  {
    id: "q1", category: "identificacao", emoji: "🪖",
    scenario: "Qual EPI é obrigatório em TODA área de canteiro de obras?",
    options: ["Óculos de proteção", "Capacete de segurança", "Protetor auricular", "Máscara PFF2"],
    correctIndex: 1,
    explanation: "O capacete de segurança (NR-6) é obrigatório em todas as áreas do canteiro para proteção contra impactos na cabeça."
  },
  {
    id: "q2", category: "identificacao", emoji: "🥽",
    scenario: "Para trabalhos com risco de projeção de partículas, qual EPI protege os olhos?",
    options: ["Viseira facial", "Óculos de proteção", "Máscara de solda", "Touca árabe"],
    correctIndex: 1,
    explanation: "Óculos de proteção com lentes resistentes a impacto são obrigatórios em operações com risco de projeção."
  },
  {
    id: "q3", category: "identificacao", emoji: "🧤",
    scenario: "Qual tipo de luva é adequada para manuseio de produtos químicos?",
    options: ["Luva de vaqueta", "Luva de látex/nitrila", "Luva de malha de aço", "Luva pigmentada"],
    correctIndex: 1,
    explanation: "Luvas de látex ou nitrila oferecem barreira química contra respingos e contato com substâncias perigosas."
  },
  {
    id: "q4", category: "identificacao", emoji: "👢",
    scenario: "Qual calçado é obrigatório em canteiros de obra?",
    options: ["Tênis esportivo", "Sapato social", "Botina com biqueira de aço", "Sandália de borracha"],
    correctIndex: 2,
    explanation: "A botina de segurança com biqueira de aço protege contra impactos, perfurações e quedas de objetos."
  },
  {
    id: "q5", category: "uso_correto", emoji: "🔊",
    scenario: "A partir de qual nível de ruído o protetor auricular é OBRIGATÓRIO?",
    options: ["60 dB", "70 dB", "85 dB", "100 dB"],
    correctIndex: 2,
    explanation: "A NR-15 determina que acima de 85 dB o uso de protetor auricular é obrigatório para prevenir perda auditiva."
  },
  {
    id: "q6", category: "uso_correto", emoji: "🪢",
    scenario: "Em trabalhos acima de 2 metros de altura, qual EPI é indispensável?",
    options: ["Luva de proteção", "Cinto de segurança tipo paraquedista", "Óculos escuros", "Protetor solar"],
    correctIndex: 1,
    explanation: "O cinto tipo paraquedista com trava-quedas é obrigatório em alturas superiores a 2m conforme NR-35."
  },
  {
    id: "q7", category: "uso_correto", emoji: "😷",
    scenario: "Qual a forma CORRETA de usar uma máscara PFF2?",
    options: ["Abaixo do nariz para respirar melhor", "Cobrindo nariz e boca com vedação completa", "Apenas sobre a boca", "Pendurada no pescoço até precisar"],
    correctIndex: 1,
    explanation: "A PFF2 deve cobrir nariz e boca com vedação total para filtrar pelo menos 94% das partículas."
  },
  {
    id: "q8", category: "uso_correto", emoji: "🦺",
    scenario: "Quando o colete refletivo deve ser utilizado?",
    options: ["Apenas à noite", "Apenas quando chove", "Em toda atividade com risco de atropelamento ou baixa visibilidade", "Somente fora do canteiro"],
    correctIndex: 2,
    explanation: "O colete refletivo é obrigatório em qualquer atividade com risco de atropelamento ou em áreas com tráfego de veículos/equipamentos."
  },
  {
    id: "q9", category: "situacional", emoji: "⚡",
    scenario: "Um eletricista vai trabalhar em um painel energizado. Qual EPI é ESPECÍFICO para essa atividade?",
    options: ["Luva de vaqueta", "Luva isolante classe 00", "Luva de algodão", "Luva nitrílica"],
    correctIndex: 1,
    explanation: "Luvas isolantes de borracha (classe conforme a tensão) são obrigatórias para trabalhos com eletricidade viva."
  },
  {
    id: "q10", category: "situacional", emoji: "🔥",
    scenario: "Para operações de solda, além da máscara de solda, qual EPI protege as mãos?",
    options: ["Luva de procedimento", "Luva de raspa de couro", "Luva de látex", "Luva de algodão"],
    correctIndex: 1,
    explanation: "Luvas de raspa de couro resistem a altas temperaturas e respingos de solda."
  },
  {
    id: "q11", category: "situacional", emoji: "🌧️",
    scenario: "Trabalhando sob chuva em área aberta, qual EPI adicional é recomendado?",
    options: ["Guarda-chuva", "Capa de chuva impermeável", "Óculos de sol", "Protetor solar"],
    correctIndex: 1,
    explanation: "A capa impermeável protege contra hipotermia e mantém a visibilidade do trabalhador em condições adversas."
  },
  {
    id: "q12", category: "situacional", emoji: "🪚",
    scenario: "Ao operar uma motosserra, qual EPI protege as pernas?",
    options: ["Calça jeans reforçada", "Perneira anticorte", "Caneleira esportiva", "Joelheira"],
    correctIndex: 1,
    explanation: "A perneira anticorte possui camadas de fibras que travam a corrente em caso de contato acidental."
  },
  {
    id: "q13", category: "situacional", emoji: "🧪",
    scenario: "Para aplicação de herbicida, qual o conjunto MÍNIMO de EPIs?",
    options: ["Apenas luvas", "Máscara, óculos, luvas nitrílicas, avental e botina", "Capacete e botina", "Colete e óculos escuros"],
    correctIndex: 1,
    explanation: "Produtos químicos exigem proteção respiratória, ocular, das mãos e do corpo conforme a FISPQ do produto."
  },
  {
    id: "q14", category: "norma", emoji: "📋",
    scenario: "Qual NR regulamenta os Equipamentos de Proteção Individual?",
    options: ["NR-4", "NR-6", "NR-12", "NR-35"],
    correctIndex: 1,
    explanation: "A NR-6 estabelece as obrigações sobre EPIs: seleção, fornecimento, uso, guarda e conservação."
  },
  {
    id: "q15", category: "norma", emoji: "📝",
    scenario: "De quem é a responsabilidade de fornecer EPIs gratuitamente?",
    options: ["Do trabalhador", "Do sindicato", "Do empregador", "Do governo"],
    correctIndex: 2,
    explanation: "A NR-6 determina que o empregador deve fornecer EPIs adequados e em perfeito estado, gratuitamente."
  },
  {
    id: "q16", category: "norma", emoji: "🔍",
    scenario: "O que significa o CA (Certificado de Aprovação) em um EPI?",
    options: ["Marca do fabricante", "Aprovação do Ministério do Trabalho para comercialização", "Garantia de durabilidade", "Código de barras do produto"],
    correctIndex: 1,
    explanation: "O CA garante que o EPI foi testado e aprovado pelo órgão competente, sendo obrigatório para comercialização."
  },
  {
    id: "q17", category: "norma", emoji: "⚠️",
    scenario: "O trabalhador que se recusa a usar EPI pode sofrer qual penalidade?",
    options: ["Nenhuma, é opcional", "Apenas advertência verbal", "Advertência, suspensão e até demissão por justa causa", "Multa financeira pessoal"],
    correctIndex: 2,
    explanation: "A CLT prevê que a recusa injustificada de uso de EPI é falta grave, podendo resultar em demissão por justa causa."
  },
  {
    id: "q18", category: "situacional", emoji: "🏗️",
    scenario: "Ao transitar por uma área de escavação, qual EPI protege contra quedas no buraco?",
    options: ["Capacete", "Nenhum EPI, apenas sinalização", "Cinto de segurança ancorado", "Protetor facial"],
    correctIndex: 1,
    explanation: "Em áreas de escavação, a principal proteção é a sinalização e isolamento da área (EPC). O trabalhador deve usar capacete e botina como EPIs básicos."
  },
  {
    id: "q19", category: "uso_correto", emoji: "🔄",
    scenario: "Com que frequência o capacete de segurança deve ser trocado?",
    options: ["Apenas quando quebrar", "A cada 5 anos obrigatoriamente", "Conforme orientação do fabricante ou quando apresentar danos", "Nunca, é vitalício"],
    correctIndex: 2,
    explanation: "O capacete deve ser substituído conforme a vida útil indicada pelo fabricante ou imediatamente se apresentar trincas, deformações ou após impacto."
  },
  {
    id: "q20", category: "identificacao", emoji: "🎧",
    scenario: "Qual é a diferença principal entre protetor auricular tipo concha e tipo plug?",
    options: ["Não há diferença", "Concha cobre toda a orelha, plug é inserido no canal auditivo", "Plug é para ruídos altos, concha para baixos", "Concha é descartável, plug é reutilizável"],
    correctIndex: 1,
    explanation: "O tipo concha (abafador) envolve toda a orelha externamente, enquanto o plug (inserção) é colocado dentro do canal auditivo."
  },
  // Novas perguntas
  {
    id: "q21", category: "identificacao", emoji: "🪖",
    scenario: "Qual a diferença entre capacete classe A e classe B?",
    options: ["Não há diferença", "Classe A protege contra impactos; Classe B também protege contra choques elétricos", "Classe B é mais leve", "Classe A é para obras e Classe B para escritórios"],
    correctIndex: 1,
    explanation: "Capacete classe B possui isolamento elétrico além da proteção contra impactos, sendo obrigatório em trabalhos com risco elétrico."
  },
  {
    id: "q22", category: "uso_correto", emoji: "🧤",
    scenario: "É correto usar luvas de raspa de couro para manuseio de produtos químicos?",
    options: ["Sim, protege contra tudo", "Não, luvas de raspa não oferecem barreira química", "Sim, se forem novas", "Depende do produto"],
    correctIndex: 1,
    explanation: "Luvas de raspa de couro são permeáveis a líquidos e não oferecem proteção química. Use luvas nitrílicas ou de PVC conforme a FISPQ."
  },
  {
    id: "q23", category: "situacional", emoji: "🏔️",
    scenario: "Em trabalhos em taludes com inclinação acima de 45°, qual EPI adicional é necessário?",
    options: ["Apenas botina", "Cinto de segurança com trava-quedas e linha de vida", "Joelheira", "Colete salva-vidas"],
    correctIndex: 1,
    explanation: "Taludes com inclinação acentuada exigem cinto paraquedista conectado a linha de vida para prevenir quedas."
  },
  {
    id: "q24", category: "norma", emoji: "📊",
    scenario: "Qual NR trata especificamente de trabalho em altura?",
    options: ["NR-6", "NR-10", "NR-35", "NR-18"],
    correctIndex: 2,
    explanation: "A NR-35 regulamenta o trabalho em altura (acima de 2m), exigindo planejamento, EPIs específicos e treinamento."
  },
  {
    id: "q25", category: "identificacao", emoji: "🦺",
    scenario: "O que é um EPC e qual a diferença para um EPI?",
    options: ["São a mesma coisa", "EPC protege o coletivo (ex: guarda-corpo); EPI protege o individual (ex: capacete)", "EPC é mais caro que EPI", "EPI protege o coletivo"],
    correctIndex: 1,
    explanation: "EPC (Equipamento de Proteção Coletiva) protege todos no ambiente (ex: guarda-corpo, rede). EPI protege individualmente cada trabalhador."
  },
  {
    id: "q26", category: "uso_correto", emoji: "👃",
    scenario: "Quando é necessário usar respirador com filtro químico ao invés de PFF2?",
    options: ["Nunca, PFF2 serve para tudo", "Quando houver exposição a vapores ou gases tóxicos", "Apenas em ambientes fechados", "Apenas para poeira"],
    correctIndex: 1,
    explanation: "O PFF2 filtra apenas partículas. Para vapores e gases (solventes, tintas, herbicidas), é necessário respirador com filtro químico adequado."
  },
  {
    id: "q27", category: "situacional", emoji: "🔨",
    scenario: "Ao utilizar uma marreta, além de luvas e capacete, qual EPI protege os olhos?",
    options: ["Nenhum é necessário", "Óculos de proteção contra projeção de fragmentos", "Óculos de sol", "Viseira de solda"],
    correctIndex: 1,
    explanation: "O impacto da marreta pode projetar fragmentos de concreto ou pedra, tornando obrigatório o uso de óculos de proteção."
  },
  {
    id: "q28", category: "norma", emoji: "🏥",
    scenario: "O que é a FISPQ e qual sua relação com EPIs?",
    options: ["É uma marca de EPI", "Ficha com dados de segurança do produto químico que indica os EPIs necessários", "É um tipo de treinamento", "Não tem relação com EPIs"],
    correctIndex: 1,
    explanation: "A FISPQ (Ficha de Informações de Segurança de Produtos Químicos) indica os EPIs necessários para manuseio seguro de cada produto."
  },
  {
    id: "q29", category: "uso_correto", emoji: "☀️",
    scenario: "O protetor solar é considerado um EPI?",
    options: ["Não, é apenas cosmético", "Sim, para trabalhadores expostos à radiação solar conforme NR-21", "Sim, mas apenas no verão", "Não, é EPC"],
    correctIndex: 1,
    explanation: "O protetor solar é reconhecido como EPI para trabalhadores com exposição prolongada ao sol, devendo ser fornecido pelo empregador."
  },
  {
    id: "q30", category: "identificacao", emoji: "🥾",
    scenario: "Qual a diferença entre botina com biqueira de aço e biqueira de composite?",
    options: ["São iguais", "Composite é mais leve e não conduz eletricidade; aço é mais resistente a impactos", "Aço é mais leve", "Composite é de metal"],
    correctIndex: 1,
    explanation: "Biqueira de composite (fibra) é mais leve, não conduz eletricidade e calor, sendo ideal para trabalhos com risco elétrico. Aço oferece maior resistência a impactos."
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  identificacao: { label: "Identificação", color: "text-blue-500" },
  uso_correto: { label: "Uso Correto", color: "text-green-500" },
  situacional: { label: "Situacional", color: "text-amber-500" },
  norma: { label: "Normas (NR)", color: "text-purple-500" },
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

export function EPIGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [questions, setQuestions] = useState<EPIQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string; chosenIndex: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [answers, setAnswers] = useState<{ question: EPIQuestion; chosenIndex: number; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveScore = useSaveGameScore();
  const scoreSavedRef = useRef(false);
  const playedIdsRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const answersRef = useRef<{ question: EPIQuestion; chosenIndex: number; correct: boolean }[]>([]);
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
          saveScore.mutate({ gameId: "epi", score: finalScore, correctAnswers: correctCount, totalQuestions: finalAnswers.length, bestStreak: finalBestStreak });
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
            <div className="text-6xl md:text-8xl">🦺</div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Quiz de EPIs</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Teste seus conhecimentos sobre Equipamentos de Proteção Individual! Responda antes que o tempo acabe. Você tem 3 vidas.
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
          {/* Top bar */}
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

          {/* Time bar */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timeColor} rounded-full`}
              initial={{ width: "100%" }}
              animate={{ width: `${timeBarPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Question */}
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

          {/* Options */}
          <div className="grid gap-2">
            {currentQuestion.options.map((option, idx) => {
              let optionClass = "border-border hover:border-primary/50 hover:bg-primary/5";
              if (feedback) {
                if (idx === currentQuestion.correctIndex) {
                  optionClass = "border-green-500 bg-green-500/10";
                } else if (idx === feedback.chosenIndex && !feedback.correct) {
                  optionClass = "border-red-500 bg-red-500/10";
                } else {
                  optionClass = "border-border opacity-50";
                }
              }

              return (
                <Button
                  key={idx}
                  variant="outline"
                  disabled={!!feedback}
                  onClick={() => handleAnswer(idx)}
                  className={`h-auto py-3 px-4 text-left justify-start border-2 transition-all ${optionClass}`}
                >
                  <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm text-foreground">{option}</span>
                  {feedback && idx === currentQuestion.correctIndex && (
                    <Check className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
                  )}
                  {feedback && idx === feedback.chosenIndex && !feedback.correct && (
                    <X className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Explanation after answer */}
          {feedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{feedback.explanation}</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {gameState === "finished" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">{lives > 0 ? "🏆" : "💔"}</div>
              <CardTitle className="text-2xl">{lives > 0 ? "Parabéns!" : "Fim de Jogo!"}</CardTitle>
              {lives <= 0 && <p className="text-sm text-muted-foreground">Suas vidas acabaram!</p>}
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
                <h4 className="text-sm font-semibold text-foreground">Resumo</h4>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {answers.map((a, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${a.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {a.correct ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-base">{a.question.emoji}</span>
                      <span className="flex-1 truncate text-foreground text-xs">{a.question.scenario.substring(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Lembre-se!</p>
                    <p className="text-xs text-muted-foreground">O uso correto de EPIs é obrigação do trabalhador (NR-6). Inspecione seus equipamentos antes de cada uso e comunique qualquer dano ao seu encarregado!</p>
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
