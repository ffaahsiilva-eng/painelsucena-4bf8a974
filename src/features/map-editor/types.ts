
export type MapObjectType = 
  | "marker" 
  | "sprinkler" 
  | "number" 
  | "arrow" 
  | "text" 
  | "line" 
  | "polygon" 
  | "circle" 
  | "route" 
  | "measure" 
  | "image"
  | "icon";

export type ToolId = MapObjectType | "select" | "pan";

export interface Pt {
  x: number;
  y: number;
}

export type LayerId = string;

export interface MapObject {
  id: string;
  type: MapObjectType;
  x: number; // For point-based like text, icon, number
  y: number;
  points?: Pt[]; // For lines, polygons, routes
  radius?: number; // For circles
  r?: number; // Compatibility
  cx?: number; // Compatibility
  cy?: number; // Compatibility
  label?: string;
  value?: string; // Compatibility for number tool
  text?: string; // Compatibility for text tool
  description?: string;
  rotation?: number;
  scale?: number;
  opacity?: number;
  color?: string; // Generic color
  fill?: string; // Compatibility
  fillOpacity?: number; // Compatibility
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  width?: number; // Compatibility
  fontSize?: number;
  size?: number; // Compatibility for icons/numbers/text
  font?: string; // Compatibility
  bold?: boolean; // Compatibility
  italic?: boolean; // Compatibility
  iconId?: string;
  kind?: string; // Compatibility for icon kind
  layerId: LayerId;
  layer?: LayerId; // Compatibility
  locked?: boolean;
  visible?: boolean;
  hidden?: boolean; // Compatibility
  dashed?: boolean; // Compatibility
  closed?: boolean; // For routes/polygons
  showDirection?: boolean; // For routes
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  metadata?: Record<string, any>;
  mode?: "distance" | "area"; // Compatibility for measure
}

export interface MapLayer {
  id: LayerId;
  label: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface EditorState {
  objects: MapObject[];
  layers: MapLayer[];
  selection: string[];
}

export const DEFAULT_LAYERS: MapLayer[] = [
  { id: "base", label: "Mapa Base", visible: true, locked: true, color: "#94a3b8" },
  { id: "aspersores", label: "Aspersores", visible: true, locked: false, color: "#3b82f6" },
  { id: "tubulacao", label: "Tubulação", visible: true, locked: false, color: "#10b981" },
  { id: "rotas", label: "Rotas", visible: true, locked: false, color: "#f59e0b" },
  { id: "anotacoes", label: "Anotações", visible: true, locked: false, color: "#ef4444" },
];
