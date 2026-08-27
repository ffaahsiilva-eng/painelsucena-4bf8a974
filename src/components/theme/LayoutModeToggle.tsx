import { Sun, Moon } from "lucide-react";
import { useLayoutMode } from "@/contexts/LayoutModeContext";
import { cn } from "@/lib/utils";

export function LayoutModeToggle() {
  const { layoutMode, toggleLayoutMode, setLayoutMode } = useLayoutMode();
  const isModern = layoutMode === "modern";

  return (
    <button
      type="button"
      className={cn(
        "relative flex items-center h-8 w-[68px] rounded-full p-1 border transition-all duration-300",
        isModern
          ? "bg-white/10 border-white/20 hover:bg-white/20"
          : "bg-black/40 border-yellow-500/30 hover:border-yellow-500/60"
      )}
      aria-label={isModern ? "Alternar para layout clássico" : "Alternar para layout moderno"}
      title={isModern ? "Layout moderno ativo" : "Layout clássico ativo"}
    >
      <div
        className={cn(
          "absolute h-6 w-8 rounded-full shadow-md transition-all duration-300 flex items-center justify-center cursor-pointer",
          isModern 
            ? "left-1 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
            : "left-[calc(100%-2.25rem)] bg-zinc-800 border border-yellow-500/50"
        )}
        onClick={toggleLayoutMode}
      />
      
      <div className="relative z-10 flex w-full justify-between px-1.5 items-center">
        <div 
          onClick={() => setLayoutMode("modern")}
          className="cursor-pointer p-0.5 rounded-full hover:bg-black/10"
        >
          <Sun 
            className={cn(
              "w-4 h-4 transition-all duration-300", 
              isModern ? "text-yellow-600 drop-shadow-md opacity-100" : "text-muted-foreground opacity-50"
            )} 
          />
        </div>
        <div 
          onClick={() => setLayoutMode("legacy")}
          className="cursor-pointer p-0.5 rounded-full hover:bg-white/10"
        >
          <Moon 
            className={cn(
              "w-3.5 h-3.5 transition-all duration-300",
              !isModern ? "text-yellow-400 drop-shadow-md opacity-100" : "text-zinc-600 opacity-50"
            )} 
          />
        </div>
      </div>
    </button>
  );
}
