import React, { createContext, useContext, useEffect, useState } from "react";

type LayoutMode = "modern" | "legacy";

interface LayoutModeContextProps {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayoutMode: () => void;
}

const LayoutModeContext = createContext<LayoutModeContextProps | undefined>(undefined);

export function LayoutModeProvider({ children }: { children: React.ReactNode }) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    // Carrega a preferência salva antes mesmo do primeiro render completo
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sucena-layout-mode") as LayoutMode;
      if (saved === "modern" || saved === "legacy") {
        return saved;
      }
    }
    return "modern"; // Padrão
  });

  // Atualiza HTML attr e localStorage sempre que mudar
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-layout", layoutMode);
      localStorage.setItem("sucena-layout-mode", layoutMode);
    }
  }, [layoutMode]);

  // Handler amigável para alternância
  const toggleLayoutMode = () => {
    setLayoutModeState((prev) => (prev === "modern" ? "legacy" : "modern"));
  };

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode);
  };

  return (
    <LayoutModeContext.Provider value={{ layoutMode, setLayoutMode, toggleLayoutMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

// Hook de consumo fácil
export function useLayoutMode() {
  const context = useContext(LayoutModeContext);
  if (!context) {
    throw new Error("useLayoutMode must be used within a LayoutModeProvider");
  }
  return context;
}
