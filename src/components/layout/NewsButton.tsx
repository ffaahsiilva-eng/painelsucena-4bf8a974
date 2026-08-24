import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface NewsItem {
  title: string;
  category: string;
  link: string;
  pubDate?: string;
  source?: string;
  imageUrl?: string;
}

function getSourceFavicon(source?: string): string | null {
  if (!source) return null;
  return `https://www.google.com/s2/favicons?domain=${source}&sz=32`;
}

export const NewsButton = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-news");
      if (error) throw error;
      if (data?.items?.length > 0) setNews(data.items);
    } catch (e) {
      console.error("Error fetching news:", e);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isFromDate = (dateStr: string | undefined, target: Date) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
    } catch { return false; }
  };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayNews = news.filter(i => isFromDate(i.pubDate, now));
  const displayNews = todayNews.length > 0 ? todayNews : news.filter(i => isFromDate(i.pubDate, yesterday));
  const displayLabel = todayNews.length > 0 ? "Notícias do Dia" : "Notícias de Ontem";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try { return new Date(dateStr).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground relative"
          >
            <Globe className="h-4 w-4" />
            {news.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p className="text-xs">Notícias</p></TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              {displayLabel}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="space-y-3">
              {!loaded || displayNews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma notícia disponível.
                </p>
              ) : (
                displayNews.map((item, i) => {
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
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {favicon && <img loading="lazy" decoding="async" src={favicon} alt="" className="h-4 w-4 rounded-sm shrink-0" />}
                          <Badge variant="outline" className="shrink-0 text-[10px]">{item.category}</Badge>
                          {item.source && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{item.source}</span>
                          )}
                          {item.pubDate && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{formatDate(item.pubDate)}</span>
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
