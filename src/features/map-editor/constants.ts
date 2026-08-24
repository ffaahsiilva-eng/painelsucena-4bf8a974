
import { MapLayer, Pt } from "./types";

export const DEFAULT_LAYERS: MapLayer[] = [
  { id: "base", label: "Mapa Base", visible: true, locked: true, color: "#94a3b8" },
  { id: "aspersores", label: "Aspersores", visible: true, locked: false, color: "#3b82f6" },
  { id: "tubulacao", label: "Tubulação", visible: true, locked: false, color: "#10b981" },
  { id: "rotas", label: "Rotas", visible: true, locked: false, color: "#f59e0b" },
  { id: "anotacoes", label: "Anotações", visible: true, locked: false, color: "#ef4444" },
];
