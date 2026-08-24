import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { RecyclingGame } from "@/components/games/RecyclingGame";
import { EPIGame } from "@/components/games/EPIGame";
import { RocagemGame } from "@/components/games/RocagemGame";
import { GabiaoGame } from "@/components/games/GabiaoGame";

import { GameRankings } from "@/components/games/GameRankings";

type ActiveGame = null | "recycling" | "epi" | "rocagem" | "gabiao";

interface GameCover {
  id: ActiveGame & string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  borderColor: string;
  badgeLabel: string;
  badgeColor: string;
}

const GAMES: GameCover[] = [
  {
    id: "recycling",
    emoji: "♻️",
    title: "Coleta Seletiva",
    subtitle: "Meio Ambiente",
    description: "Descarte cada resíduo no coletor correto! Teste seus conhecimentos sobre reciclagem e ganhe pontos.",
    gradient: "from-emerald-500/20 via-green-500/10 to-teal-500/20",
    borderColor: "border-emerald-500/40 hover:border-emerald-500",
    badgeLabel: "10 rodadas",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "epi",
    emoji: "🦺",
    title: "Quiz de EPIs",
    subtitle: "Segurança do Trabalho",
    description: "Teste seus conhecimentos sobre Equipamentos de Proteção Individual. Você tem 3 vidas!",
    gradient: "from-amber-500/20 via-orange-500/10 to-red-500/20",
    borderColor: "border-amber-500/40 hover:border-amber-500",
    badgeLabel: "3 vidas",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    id: "rocagem",
    emoji: "🌾",
    title: "Quiz de Roçagem",
    subtitle: "Operação & Segurança",
    description: "Segurança, técnicas e manutenção na operação de roçadeira. Quanto você sabe?",
    gradient: "from-lime-500/20 via-green-500/10 to-yellow-500/20",
    borderColor: "border-lime-500/40 hover:border-lime-500",
    badgeLabel: "3 vidas",
    badgeColor: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
  },
  {
    id: "gabiao",
    emoji: "🪨",
    title: "Quiz de Gabião",
    subtitle: "Estrutura & Drenagem",
    description: "Estruturas de contenção, drenagem e manutenção de gabiões. Teste seus conhecimentos!",
    gradient: "from-sky-500/20 via-blue-500/10 to-indigo-500/20",
    borderColor: "border-sky-500/40 hover:border-sky-500",
    badgeLabel: "3 vidas",
    badgeColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
];
export default function Games() {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        {/* Header - always visible */}
        {!activeGame && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <EditablePageTitle pageKey="games" defaultValue="Games" className="text-xl md:text-2xl font-bold text-foreground" />
                <p className="text-sm text-muted-foreground">Jogos educativos sobre segurança e meio ambiente</p>
              </div>
            </div>

            {/* Rankings */}
            <GameRankings />

            {/* Game Covers */}
            <div className="grid gap-4">
              {GAMES.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className={`border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] ${game.borderColor}`}
                    onClick={() => setActiveGame(game.id)}
                  >
                    <CardContent className={`p-0 overflow-hidden`}>
                      <div className={`bg-gradient-to-br ${game.gradient} p-6 md:p-8`}>
                        <div className="flex items-start gap-4">
                          <div className="text-5xl md:text-6xl flex-shrink-0">{game.emoji}</div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{game.subtitle}</p>
                              <h2 className="text-xl md:text-2xl font-bold text-foreground">{game.title}</h2>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{game.description}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge className={`text-xs ${game.badgeColor} border-0`}>{game.badgeLabel}</Badge>
                              <div className="flex-1" />
                              <Button size="sm" variant="secondary" className="gap-1 text-xs">
                                Jogar <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Active Game */}
        {activeGame === "recycling" && <RecyclingGame onBack={() => setActiveGame(null)} />}
        {activeGame === "epi" && <EPIGame onBack={() => setActiveGame(null)} />}
        {activeGame === "rocagem" && <RocagemGame onBack={() => setActiveGame(null)} />}
        {activeGame === "gabiao" && <GabiaoGame onBack={() => setActiveGame(null)} />}
        
      </div>
    </Layout>
  );
}
