import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Ribbon, ArrowRight, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentMonthCampaigns } from "@/data/campaignData";

export const CampaignBanner = () => {
  const currentMonthData = useMemo(() => getCurrentMonthCampaigns(), []);

  if (!currentMonthData) return null;

  const colors = currentMonthData.campaigns.map(c => c.color);
  const gradientColors = colors.length > 1 
    ? `linear-gradient(135deg, ${colors.map(c => `${c}15`).join(", ")})`
    : `${colors[0]}10`;

  const borderGradient = colors.length > 1
    ? `linear-gradient(135deg, ${colors.join(", ")})`
    : colors[0];

  return (
    <Card 
      className="relative overflow-hidden mb-6 border-0 animate-fade-in group bg-card glass-card-dashboard"
    >
      {/* Subtle tinted overlay for brand color hint without hurting contrast */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: gradientColors }}
      />
      {/* Animated gradient border with pulse effect */}
      <div 
        className="absolute inset-0 rounded-lg p-[2px] animate-pulse"
        style={{ 
          background: borderGradient,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "xor",
          WebkitMaskComposite: "xor",
          pointerEvents: "none",
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
        }}
      />

      {/* Secondary pulsing glow effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-30 blur-xl"
        style={{ 
          background: borderGradient,
          animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          animationDelay: "0.5s"
        }}
      />

      {/* Animated ribbon decorations */}
      <div className="absolute -top-4 -right-4 opacity-10 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110">
        <Ribbon className="h-32 w-32 rotate-12" style={{ color: colors[0] }} />
      </div>
      <div className="absolute -bottom-6 -left-6 opacity-10 transition-transform duration-500 group-hover:-rotate-[20deg] group-hover:scale-110">
        <Heart className="h-24 w-24 -rotate-12" style={{ color: colors[colors.length - 1] }} />
      </div>

      {/* Floating particles effect */}
      <div 
        className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full opacity-40"
        style={{ 
          backgroundColor: colors[0],
          animation: "bounce 2s ease-in-out infinite"
        }}
      />
      <div 
        className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full opacity-30"
        style={{ 
          backgroundColor: colors[colors.length > 1 ? 1 : 0],
          animation: "bounce 2.5s ease-in-out infinite",
          animationDelay: "0.3s"
        }}
      />

      <CardContent className="relative py-5 px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left side - Campaign info */}
          <div className="flex items-start gap-4">
            {/* Ribbon icon with gradient and pulse */}
            <div 
              className="p-3 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ 
                background: colors.length > 1 
                  ? `linear-gradient(135deg, ${colors.map(c => `${c}30`).join(", ")})`
                  : `${colors[0]}25`,
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              }}
            >
              {colors.length > 1 ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <defs>
                    <linearGradient id="bannerRibbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#bannerRibbonGradient)"
                    fill="url(#bannerRibbonGradient)"
                    fillOpacity="0.3"
                  />
                  <path
                    d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"
                    stroke="url(#bannerRibbonGradient)"
                  />
                  <path
                    d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
                    stroke="url(#bannerRibbonGradient)"
                  />
                </svg>
              ) : (
                <Ribbon className="h-6 w-6" style={{ color: colors[0] }} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold text-foreground drop-shadow-sm">
                  {currentMonthData.monthName} - Mês da Conscientização
                </h3>
                {currentMonthData.campaigns.map((campaign, idx) => (
                  <Badge
                    key={idx}
                    className="text-xs font-semibold border-0 shadow-sm"
                    style={{ 
                      backgroundColor: campaign.color,
                      color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      animationDelay: `${idx * 0.2}s`
                    }}
                  >
                    {campaign.colorName}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-1">
                {currentMonthData.campaigns.map((campaign, idx) => (
                  <p key={idx} className="text-sm text-foreground/90">
                    <span
                      className="font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: campaign.color,
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }}
                    >
                      {campaign.name}
                    </span>{" "}
                    {campaign.description}
                  </p>
                ))}
              </div>

            </div>
          </div>

          {/* Right side - CTA with hover effect */}
          <div className="flex-shrink-0">
            <Button 
              asChild 
              variant="outline"
              className="group/btn transition-all duration-300 hover:scale-105"
              style={{ 
                borderColor: colors[0],
                color: colors[0],
              }}
            >
              <Link to="/campanhas">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
