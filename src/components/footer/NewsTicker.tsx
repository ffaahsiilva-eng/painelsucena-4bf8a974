import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  title: string;
  category: string;
  link: string;
  pubDate?: string;
  source?: string;
  imageUrl?: string;
}

// Map team keywords to their logo files in /public/teams/
const TEAM_LOGOS: Record<string, string> = {
  "américa-mg": "/teams/america-mg.png",
  "america-mg": "/teams/america-mg.png",
  "américa mineiro": "/teams/america-mg.png",
  "athletico": "/teams/athletico-pr.png",
  "athletico-pr": "/teams/athletico-pr.png",
  "atlético-mg": "/teams/atletico-mg.png",
  "atletico-mg": "/teams/atletico-mg.png",
  "atlético mineiro": "/teams/atletico-mg.png",
  "galo": "/teams/atletico-mg.png",
  "bahia": "/teams/bahia.png",
  "botafogo": "/teams/botafogo.png",
  "bragantino": "/teams/bragantino.png",
  "red bull bragantino": "/teams/bragantino.png",
  "corinthians": "/teams/corinthians.png",
  "timão": "/teams/corinthians.png",
  "coritiba": "/teams/coritiba.png",
  "cruzeiro": "/teams/cruzeiro.png",
  "raposa": "/teams/cruzeiro.png",
  "cuiabá": "/teams/cuiaba.png",
  "cuiaba": "/teams/cuiaba.png",
  "flamengo": "/teams/flamengo.png",
  "mengão": "/teams/flamengo.png",
  "fluminense": "/teams/fluminense.png",
  "flu": "/teams/fluminense.png",
  "fortaleza": "/teams/fortaleza.png",
  "grêmio": "/teams/gremio.png",
  "gremio": "/teams/gremio.png",
  "internacional": "/teams/internacional.png",
  "inter": "/teams/internacional.png",
  "colorado": "/teams/internacional.png",
  "palmeiras": "/teams/palmeiras.png",
  "verdão": "/teams/palmeiras.png",
  "santos": "/teams/santos.png",
  "peixe": "/teams/santos.png",
  "são paulo": "/teams/sao-paulo.png",
  "sao paulo": "/teams/sao-paulo.png",
  "tricolor": "/teams/sao-paulo.png",
  "vasco": "/teams/vasco.png",
};

function findTeamLogos(text: string, category: string): string[] {
  // Only show team logos for football news
  if (!category.includes("Futebol") && !category.includes("⚽")) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, logo] of Object.entries(TEAM_LOGOS)) {
    if (lower.includes(keyword)) {
      found.add(logo);
    }
  }
  return Array.from(found).slice(0, 3);
}

// Country flag emoji map
const COUNTRY_FLAGS: Record<string, string> = {
  "brasil": "🇧🇷", "brazil": "🇧🇷",
  "argentina": "🇦🇷",
  "uruguai": "🇺🇾", "uruguay": "🇺🇾",
  "paraguai": "🇵🇾", "paraguay": "🇵🇾",
  "chile": "🇨🇱",
  "colômbia": "🇨🇴", "colombia": "🇨🇴",
  "peru": "🇵🇪",
  "equador": "🇪🇨", "ecuador": "🇪🇨",
  "venezuela": "🇻🇪",
  "bolívia": "🇧🇴", "bolivia": "🇧🇴",
  "estados unidos": "🇺🇸", "eua": "🇺🇸", "usa": "🇺🇸",
  "méxico": "🇲🇽", "mexico": "🇲🇽",
  "canadá": "🇨🇦", "canada": "🇨🇦",
  "inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "england": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "espanha": "🇪🇸", "spain": "🇪🇸",
  "portugal": "🇵🇹",
  "frança": "🇫🇷", "france": "🇫🇷",
  "alemanha": "🇩🇪", "germany": "🇩🇪",
  "itália": "🇮🇹", "italia": "🇮🇹", "italy": "🇮🇹",
  "holanda": "🇳🇱", "países baixos": "🇳🇱",
  "japão": "🇯🇵", "japan": "🇯🇵",
  "china": "🇨🇳",
  "rússia": "🇷🇺", "russia": "🇷🇺",
  "índia": "🇮🇳", "india": "🇮🇳",
  "arábia saudita": "🇸🇦", "arabia saudita": "🇸🇦",
  "austrália": "🇦🇺", "australia": "🇦🇺",
  "coreia do sul": "🇰🇷",
  "coreia do norte": "🇰🇵",
  "ucrânia": "🇺🇦", "ucrania": "🇺🇦", "ukraine": "🇺🇦",
  "israel": "🇮🇱",
  "palestina": "🇵🇸",
  "irã": "🇮🇷", "iran": "🇮🇷",
  "turquia": "🇹🇷", "turkey": "🇹🇷",
  "egito": "🇪🇬", "egypt": "🇪🇬",
  "nigéria": "🇳🇬", "nigeria": "🇳🇬",
  "marrocos": "🇲🇦", "morocco": "🇲🇦",
  "áfrica do sul": "🇿🇦",
  "cuba": "🇨🇺",
};

function findCountryFlags(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (lower.includes(keyword)) {
      found.add(flag);
    }
  }
  return Array.from(found).slice(0, 3);
}

function getSourceFavicon(source?: string): string | null {
  if (!source) return null;
  return `https://www.google.com/s2/favicons?domain=${source}&sz=32`;
}

export const NewsTicker = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-news");
      if (error) throw error;
      if (data?.items?.length > 0) {
        setNews(data.items);
      }
    } catch (e) {
      console.error("Error fetching news:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || news.length === 0) return null;

  const isFromDate = (dateStr: string | undefined, target: Date) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
    } catch {
      return false;
    }
  };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayNews = news.filter((item) => isFromDate(item.pubDate, now));
  const displayNews = todayNews.length > 0 ? todayNews : news.filter((item) => isFromDate(item.pubDate, yesterday));
  const displayLabel = todayNews.length > 0 ? "Notícias do Dia" : "Notícias de Ontem";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Build ticker with inline team logos, flags, and source favicon
  const stripEmoji = (s: string) =>
    (s || "")
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F1E6}-\u{1F1FF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const renderTickerItems = () =>
    news.map((item, i) => (
      <span key={i} className="inline-flex items-center gap-1">
        {i > 0 && <span className="mx-3 text-muted-foreground/40">•</span>}
        <span>{stripEmoji(item.title)}</span>
      </span>
    ));



  return (
    <>
      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Ver todas as notícias"
        >
          <Newspaper className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">
            Notícias
          </span>
        </button>
        <div className="overflow-hidden flex-1 min-w-0 relative">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
          <div
            ref={tickerRef}
            className="whitespace-nowrap animate-ticker text-[11px] text-muted-foreground"
            style={{ display: "inline-flex", gap: "5rem" }}
          >
            <span className="inline-flex items-center">{renderTickerItems()}</span>
            <span className="inline-flex items-center">{renderTickerItems()}</span>
          </div>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              {displayLabel}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="space-y-3">
              {displayNews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma notícia disponível.
                </p>
              ) : (
                displayNews.map((item, i) => {
                  const logos = findTeamLogos(item.title, item.category);
                  const flags = findCountryFlags(item.title);
                  const favicon = getSourceFavicon(item.source);
                  return (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border hover:bg-secondary/50 transition-colors overflow-hidden"
                    >
                      {item.imageUrl && (
                        <img loading="lazy" decoding="async"
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-32 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {favicon && (
                            <img loading="lazy" decoding="async" src={favicon} alt="" className="h-4 w-4 rounded-sm shrink-0" />
                          )}
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {item.category}
                          </Badge>
                          {logos.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              {logos.map((logo, j) => (
                                <img loading="lazy" decoding="async" key={j} src={logo} alt="" className="h-5 w-5 object-contain" />
                              ))}
                            </div>
                          )}
                          {flags.length > 0 && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {flags.map((flag, j) => (
                                <span key={j} className="text-base">{flag}</span>
                              ))}
                            </div>
                          )}
                          {item.source && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {item.source}
                            </span>
                          )}
                          {item.pubDate && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                              {formatDate(item.pubDate)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1.5 leading-snug">{item.title}</p>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
