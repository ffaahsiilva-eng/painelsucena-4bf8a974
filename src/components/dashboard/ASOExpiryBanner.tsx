import { useMemo } from "react";
import { TriangleAlert, User, Calendar } from "lucide-react";
import asoIcon from "@/assets/aso-icon.png.asset.json";
import asoMountainBg from "@/assets/aso-mountain-bg.png";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { getEffectiveAsoExpiry, getEffectiveAsoExpiryStr } from "@/lib/asoValidity";

interface ExpiringASO {
  colaboradorNome: string;
  validade: string;
  diasRestantes: number;
}

export function ASOExpiryBanner() {
  const { data: rhData } = useRHEfetivo();

  const expiringAsos = useMemo<ExpiringASO[]>(() => {
    if (!rhData?.colaboradores) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: ExpiringASO[] = [];

    for (const colab of rhData.colaboradores) {
      const vencDate = getEffectiveAsoExpiry(colab.aso, colab.admissao);
      const vencStr = getEffectiveAsoExpiryStr(colab.aso, colab.admissao);
      if (!vencDate || !vencStr) continue;

      const diffTime = vencDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 15 && diffDays >= 0) {
        results.push({
          colaboradorNome: colab.nome,
          validade: vencStr,
          diasRestantes: diffDays,
        });
      }
    }

    return results.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [rhData]);

  if (expiringAsos.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <style>{`
        .aso-banner-bg-normal {
          background: linear-gradient(135deg, rgba(255, 45, 55, 0.85), rgba(190, 0, 15, 0.80) 55%, rgba(80, 0, 10, 0.85)) !important;
        }
        .aso-banner-bg-urgent {
          background: linear-gradient(135deg, rgba(255, 30, 40, 0.90), rgba(180, 0, 10, 0.88) 55%, rgba(60, 0, 5, 0.90)) !important;
        }
        .aso-text-white {
          color: #ffffff !important;
        }
        .aso-text-white-80 {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .aso-text-white-95 {
          color: rgba(255, 255, 255, 0.95) !important;
        }
      `}</style>
      <div className="flex items-center gap-2 mb-3">
        <img loading="lazy" decoding="async" src={asoIcon.url} alt="ASO" className="h-6 w-6 object-contain" />
        <h3 className="font-semibold text-lg expiry-neon-title">ASOs a Vencer</h3>
        <Badge variant="destructive">{expiringAsos.length}</Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 px-2 pt-3 pb-6">
          {expiringAsos.map((item, idx) => {
            const isUrgent = item.diasRestantes <= 3;
            const bgClass = isUrgent ? "aso-banner-bg-urgent" : "aso-banner-bg-normal";

            return (
              <div
                key={`${item.colaboradorNome}-aso-${idx}`}
                className={`relative overflow-hidden flex-shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-300 ${bgClass}`}
                style={{
                  width: '280px',
                  height: '140px',
                  backdropFilter: 'blur(18px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                  border: '1px solid rgba(255,255,255,0.38)',
                  boxShadow: '0 12px 30px rgba(120,0,10,0.30), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(255,0,0,0.20)',
                  borderRadius: '22px',
                }}
              >
                {/* Highlight reflexo no topo para lembrar Acrylic/Mica */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[35px] pointer-events-none" 
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)' }}
                />

                {/* Textura de montanha ao fundo */}
                <div 
                  className="absolute inset-0 pointer-events-none mix-blend-overlay"
                  style={{
                    backgroundImage: `url(${asoMountainBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center right',
                    opacity: 0.18,
                    filter: 'blur(1px)'
                  }}
                />

                <div className="p-4 relative z-10 h-full flex flex-col justify-between">
                  {/* Título e Ícone de Alerta */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 
                      className="font-semibold aso-text-white tracking-wide truncate max-w-[200px]" 
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    >
                      {item.colaboradorNome}
                    </h4>
                    <TriangleAlert 
                      className="h-6 w-6 aso-text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-[pulse_3s_ease-in-out_infinite]" 
                      strokeWidth={2} 
                    />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Cápsula ASO */}
                    <div 
                      className="inline-flex items-center gap-1.5 px-3 py-1 w-fit rounded-full"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    >
                      <User className="h-3.5 w-3.5 aso-text-white" />
                      <span className="aso-text-white text-xs font-semibold tracking-wider drop-shadow-sm">ASO</span>
                    </div>

                    {/* Linha Inferior: Dias Restantes + Data */}
                    <div className="flex items-center gap-3">
                      {/* Cápsula de Dias */}
                      <div 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{
                          background: 'rgba(80,0,5,0.60)',
                          border: '1px solid rgba(255,255,255,0.25)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5 aso-text-white" />
                        <span className="aso-text-white text-xs font-bold drop-shadow-sm">
                          {item.diasRestantes === 0 ? "HOJE" : `${item.diasRestantes} dias`}
                        </span>
                      </div>

                      {/* Separador */}
                      <div className="h-[14px] w-[1px]" style={{ background: 'rgba(255,255,255,0.45)' }} />

                      {/* Data */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 aso-text-white-80" />
                        <span className="aso-text-white-95 text-xs font-medium drop-shadow-sm">
                          {item.validade}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
