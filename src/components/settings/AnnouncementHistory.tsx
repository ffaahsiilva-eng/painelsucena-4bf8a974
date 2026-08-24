// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, Calendar, Eye, Image } from "lucide-react";

interface AnnouncementWithRead {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
  read_at: string;
}

export function AnnouncementHistory() {
  const { user } = useAuth();

  const { data: viewedAnnouncements = [], isLoading } = useQuery({
    queryKey: ["viewed-announcements", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's reads with announcement details
      const { data: reads, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id, read_at")
        .eq("user_id", user.id)
        .order("read_at", { ascending: false });

      if (readsError) throw readsError;
      if (!reads || reads.length === 0) return [];

      // Get announcements for those reads
      const announcementIds = reads.map((r) => r.announcement_id);
      const { data: announcements, error: annError } = await supabase
        .from("announcements")
        .select("id, title, content, image_url, published_at")
        .in("id", announcementIds);

      if (annError) throw annError;

      // Combine data
      const announcementMap = new Map(announcements?.map((a) => [a.id, a]) || []);
      
      return reads
        .map((read) => {
          const announcement = announcementMap.get(read.announcement_id);
          if (!announcement) return null;
          return {
            ...announcement,
            read_at: read.read_at,
          };
        })
        .filter(Boolean) as AnnouncementWithRead[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Comunicados Visualizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Comunicados Visualizados
        </CardTitle>
        <CardDescription>
          Histórico de comunicados que você já visualizou.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {viewedAnnouncements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum comunicado visualizado ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {viewedAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {announcement.image_url ? (
                      <img loading="lazy" decoding="async"
                        src={announcement.image_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Publicado:{" "}
                        {format(new Date(announcement.published_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>
                        Visualizado:{" "}
                        {format(new Date(announcement.read_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {viewedAnnouncements.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Badge variant="secondary">
              {viewedAnnouncements.length} comunicado(s) visualizado(s)
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
