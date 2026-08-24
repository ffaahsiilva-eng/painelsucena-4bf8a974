import { useMemo } from "react";
import { Ribbon } from "lucide-react";
import { getCampaignColors, getCurrentMonthCampaigns } from "@/data/campaignData";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export const CampaignRibbon = () => {
  const currentMonthData = useMemo(() => getCurrentMonthCampaigns(), []);
  const colors = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return getCampaignColors(month);
  }, []);

  if (!currentMonthData || colors.length === 0) return null;

  const campaignNames = currentMonthData.campaigns.map(c => c.name).join(" & ");

  // Create gradient for multiple colors or solid for single
  const gradientStyle = colors.length > 1
    ? {
        background: `linear-gradient(135deg, ${colors.join(", ")})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }
    : { color: colors[0] };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          to="/campanhas" 
          className="flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
        >
          <div className="relative">
            {colors.length > 1 ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <defs>
                  <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    {colors.map((color, index) => (
                      <stop
                        key={index}
                        offset={`${(index / (colors.length - 1)) * 100}%`}
                        stopColor={color}
                      />
                    ))}
                  </linearGradient>
                </defs>
                <path
                  d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
                  stroke="url(#ribbonGradient)"
                  fill="url(#ribbonGradient)"
                  fillOpacity="0.2"
                />
                <path
                  d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"
                  stroke="url(#ribbonGradient)"
                />
                <path
                  d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
                  stroke="url(#ribbonGradient)"
                />
              </svg>
            ) : (
              <Ribbon className="h-5 w-5" style={{ color: colors[0] }} />
            )}
            {/* Pulse animation indicator */}
            <span 
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: colors[0] }}
            />
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="font-medium">{campaignNames}</p>
        <p className="text-xs text-muted-foreground">
          Clique para ver todas as campanhas
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
