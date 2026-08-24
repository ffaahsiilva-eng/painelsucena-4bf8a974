import { 
  Fuel,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FuelLevel = "empty" | "quarter" | "half" | "three_quarters" | "full";

interface FuelOption {
  id: FuelLevel;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  angle: number;
}

const fuelOptions: FuelOption[] = [
  {
    id: "empty",
    label: "Vazio",
    shortLabel: "Vazio",
    color: "text-red-500",
    bgColor: "bg-red-500",
    angle: -60,
  },
  {
    id: "quarter",
    label: "1/4",
    shortLabel: "1/4",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    angle: -30,
  },
  {
    id: "half",
    label: "1/2",
    shortLabel: "1/2",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
    angle: 0,
  },
  {
    id: "three_quarters",
    label: "3/4",
    shortLabel: "3/4",
    color: "text-lime-500",
    bgColor: "bg-lime-500",
    angle: 30,
  },
  {
    id: "full",
    label: "Cheio",
    shortLabel: "Cheio",
    color: "text-green-500",
    bgColor: "bg-green-500",
    angle: 60,
  },
];

interface FuelLevelGaugeProps {
  selectedLevel: FuelLevel;
  onLevelChange: (level: FuelLevel) => void;
  disabled?: boolean;
}

export function FuelLevelGauge({ selectedLevel, onLevelChange, disabled }: FuelLevelGaugeProps) {
  const currentIndex = fuelOptions.findIndex(opt => opt.id === selectedLevel);
  const currentOption = fuelOptions[currentIndex] || fuelOptions[2]; // Default to half

  const handlePrevious = () => {
    if (disabled) return;
    const newIndex = currentIndex <= 0 ? fuelOptions.length - 1 : currentIndex - 1;
    onLevelChange(fuelOptions[newIndex].id);
  };

  const handleNext = () => {
    if (disabled) return;
    const newIndex = currentIndex >= fuelOptions.length - 1 ? 0 : currentIndex + 1;
    onLevelChange(fuelOptions[newIndex].id);
  };

  const handleOptionClick = (index: number) => {
    if (disabled) return;
    onLevelChange(fuelOptions[index].id);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Fuel Icon Header */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Fuel className="h-4 w-4" />
        <span className="text-xs font-medium">Nível de Combustível</span>
      </div>

      {/* Gauge Container */}
      <div className="relative w-36 h-20 sm:w-44 sm:h-24">
        {/* Gauge Background Arc */}
        <svg 
          viewBox="0 0 120 70" 
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Gradient colored segments from red (empty) to green (full) */}
          <path
            d="M 12 55 A 48 48 0 0 1 28 25"
            fill="none"
            stroke="#ef4444"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "empty" ? 1 : 0.3}
          />
          <path
            d="M 32 20 A 48 48 0 0 1 50 12"
            fill="none"
            stroke="#f97316"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "quarter" ? 1 : 0.3}
          />
          <path
            d="M 54 10 A 48 48 0 0 1 66 10"
            fill="none"
            stroke="#eab308"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "half" ? 1 : 0.3}
          />
          <path
            d="M 70 12 A 48 48 0 0 1 88 20"
            fill="none"
            stroke="#84cc16"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "three_quarters" ? 1 : 0.3}
          />
          <path
            d="M 92 25 A 48 48 0 0 1 108 55"
            fill="none"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={currentOption.id === "full" ? 1 : 0.3}
          />

          {/* Tick marks and labels */}
          {/* E (Empty) */}
          <text x="8" y="48" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="bold">E</text>
          {/* F (Full) */}
          <text x="106" y="48" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="bold">F</text>

          {/* Center point */}
          <circle cx="60" cy="60" r="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />

          {/* Red Pointer */}
          <g 
            style={{ 
              transform: `rotate(${currentOption.angle}deg)`,
              transformOrigin: "60px 60px",
              transition: "transform 0.3s ease-out"
            }}
          >
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="18"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon
              points="60,10 55,20 65,20"
              fill="#ef4444"
            />
          </g>

          {/* Center circle overlay */}
          <circle cx="60" cy="60" r="4" fill="#ef4444" />
        </svg>

        {/* Clickable areas for each fuel level */}
        <button
          type="button"
          onClick={() => handleOptionClick(0)}
          disabled={disabled}
          className={cn(
            "absolute left-0 top-6 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            currentOption.id === "empty" 
              ? "bg-red-500 text-white scale-110" 
              : "bg-muted/50 hover:bg-red-500/20 text-muted-foreground"
          )}
        >
          E
        </button>
        <button
          type="button"
          onClick={() => handleOptionClick(1)}
          disabled={disabled}
          className={cn(
            "absolute left-4 sm:left-5 -top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            currentOption.id === "quarter" 
              ? "bg-orange-500 text-white scale-110" 
              : "bg-muted/50 hover:bg-orange-500/20 text-muted-foreground"
          )}
        >
          ¼
        </button>
        <button
          type="button"
          onClick={() => handleOptionClick(2)}
          disabled={disabled}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            currentOption.id === "half" 
              ? "bg-yellow-500 text-white scale-110" 
              : "bg-muted/50 hover:bg-yellow-500/20 text-muted-foreground"
          )}
        >
          ½
        </button>
        <button
          type="button"
          onClick={() => handleOptionClick(3)}
          disabled={disabled}
          className={cn(
            "absolute right-4 sm:right-5 -top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            currentOption.id === "three_quarters" 
              ? "bg-lime-500 text-white scale-110" 
              : "bg-muted/50 hover:bg-lime-500/20 text-muted-foreground"
          )}
        >
          ¾
        </button>
        <button
          type="button"
          onClick={() => handleOptionClick(4)}
          disabled={disabled}
          className={cn(
            "absolute right-0 top-6 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            currentOption.id === "full" 
              ? "bg-green-500 text-white scale-110" 
              : "bg-muted/50 hover:bg-green-500/20 text-muted-foreground"
          )}
        >
          F
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={disabled}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium min-w-[80px] text-center",
          currentOption.bgColor
        )}>
          {currentOption.shortLabel}
        </div>
        
        <button
          type="button"
          onClick={handleNext}
          disabled={disabled}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
