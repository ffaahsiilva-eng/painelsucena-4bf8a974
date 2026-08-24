import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Wrench, Image as ImageIcon, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { useDesvios } from "@/hooks/useDesvios";
import { useAllEquipmentMovements } from "@/hooks/useEquipmentMovements";
import { useInstaCenaPosts } from "@/hooks/useInstaCena";
import { useRDOReports } from "@/hooks/useRDOReports";

type ActivityKind = "equipment" | "desvio" | "post" | "planned";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  date: Date;
  link: string;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `Há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Há ${days}d`;
  return date.toLocaleDateString("pt-BR");
}

const iconFor = (kind: ActivityKind) => {
  switch (kind) {
    case "equipment":
      return { Icon: Wrench, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" };
    case "desvio":
      return { Icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" };
    case "post":
      return { Icon: ImageIcon, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" };
    case "planned":
      return { Icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
  }
};

export function RecentActivitiesCard() {
  const { data: desvios } = useDesvios();
  const { data: movements } = useAllEquipmentMovements();
  const { data: posts } = useInstaCenaPosts();
  const { data: rdos } = useRDOReports();

  const items = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    (movements || []).slice(0, 5).forEach((m: any) => {
      const isEntry = m.movement_type === "entrada";
      list.push({
        id: `eq-${m.id}`,
        kind: "equipment",
        title: `${isEntry ? "Entrada" : "Saída"}: ${m.equipment_name}`,
        subtitle: `Placa ${m.plate}`,
        date: new Date(m.created_at),
        link: "/equipamentos",
      });
    });

    (desvios || []).forEach((d: any) => {
      const createdAt = new Date(d.created_at);
      const isWithin24h = Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000;
      
      if (isWithin24h) {
        list.push({
          id: `dv-${d.id}`,
          kind: "desvio",
          title: d.description?.slice(0, 60) || "Novo desvio registrado",
          subtitle: `por ${d.created_by_name}`,
          date: createdAt,
          link: "/desvios",
        });
      }
    });

    (posts || []).slice(0, 5).forEach((p: any) => {
      list.push({
        id: `pt-${p.id}`,
        kind: "post",
        title: p.user_name + " publicou no InstaCena",
        subtitle: (p.content || "").slice(0, 60) || "Nova foto",
        date: new Date(p.created_at),
        link: "/instacena",
      });
    });

    (rdos || []).filter(r => r.planned_activities).slice(0, 3).forEach((r) => {
      list.push({
        id: `pl-${r.id}`,
        kind: "planned",
        title: "Planejamento cadastrado",
        subtitle: `Para o dia ${new Date(r.report_date + "T12:00:00").toLocaleDateString("pt-BR")}`,
        date: new Date(r.updated_at),
        link: "/atividade-prevista",
      });
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);
  }, [desvios, movements, posts, rdos]);

  return (
    <div className="rounded-2xl p-5 bg-card border border-border shadow-sm glass-card-dashboard">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-muted">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Atividades recentes</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma atividade recente
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const { Icon, color, bg } = iconFor(it.kind);
            return (
              <Link
                key={it.id}
                to={it.link}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className={`p-2 rounded-full ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.subtitle}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(it.date)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        to="/instacena"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Ver todas atividades
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
