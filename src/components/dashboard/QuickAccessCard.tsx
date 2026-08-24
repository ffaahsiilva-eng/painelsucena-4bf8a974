import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: "primary" | "info" | "success" | "warning";
}

const colorClasses = {
  primary: "from-primary/20 to-primary/5 hover:from-primary/30",
  info: "from-info/20 to-info/5 hover:from-info/30",
  success: "from-success/20 to-success/5 hover:from-success/30",
  warning: "from-warning/20 to-warning/5 hover:from-warning/30",
};

const iconColorClasses = {
  primary: "text-primary bg-primary/20",
  info: "text-info bg-info/20",
  success: "text-success bg-success/20",
  warning: "text-warning bg-warning/20",
};

const QuickAccessCard = ({ title, description, icon: Icon, path, color }: QuickAccessCardProps) => {
  return (
    <Link
      to={path}
      className={`group relative block bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 hover-lift border border-border/30 transition-all duration-300 glass-card-dashboard`}
    >
      <div className={`inline-flex p-3 rounded-lg ${iconColorClasses[color]} mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm">{description}</p>
      
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-primary text-sm font-medium">Acessar →</span>
      </div>
    </Link>
  );
};

export default QuickAccessCard;
