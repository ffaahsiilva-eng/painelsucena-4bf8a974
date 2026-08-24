import {
  Sparkles,
  Leaf,
  Hammer,
  Wrench,
  Ruler,
  Droplet,
  Truck,
  Shovel,
  HardHat,
  TreePine,
  Layers,
  Package,
  ClipboardList,
  FileText,
  Clock,
  Cog,
  Boxes,
  Mountain,
  Flame,
  Sprout,
  Trees,
  Building2,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type FillMode = "input" | "check";

export interface ActivityField {
  id: string;
  name: string;
  mode: FillMode;
  unit?: string; // used when mode === input; free-form label like "m²", "Un", "L"
  locations: string[]; // preset options
  allowCustomLocation: boolean; // allow free-typed location
}

export interface ActivityConfig {
  fields: ActivityField[];
}

export interface ActivityEntry {
  id: string;
  field_id: string;
  value?: string; // number as string for input mode
  location?: string;
  note?: string;
  checked?: boolean;
  label?: string; // custom per-row name (used in check mode)
}

export const CUSTOM_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Leaf,
  Hammer,
  Wrench,
  Ruler,
  Droplet,
  Truck,
  Shovel,
  HardHat,
  TreePine,
  Trees,
  Layers,
  Package,
  Boxes,
  ClipboardList,
  FileText,
  Clock,
  Cog,
  Mountain,
  Flame,
  Sprout,
  Building2,
  ShieldCheck,
  Zap,
};

export const ICON_NAMES = Object.keys(CUSTOM_ICONS);

export function getIconComponent(name?: string | null): LucideIcon {
  if (!name) return Sparkles;
  return CUSTOM_ICONS[name] ?? Sparkles;
}

export const COLOR_PRESETS: { key: string; label: string; from: string; to: string; ring: string }[] = [
  { key: "amber", label: "Âmbar", from: "#d4a84c", to: "#f0d78c", ring: "#c9a84c" },
  { key: "green", label: "Verde", from: "#16a34a", to: "#86efac", ring: "#22c55e" },
  { key: "blue", label: "Azul", from: "#2563eb", to: "#93c5fd", ring: "#3b82f6" },
  { key: "purple", label: "Roxo", from: "#7e22ce", to: "#d8b4fe", ring: "#a855f7" },
  { key: "red", label: "Vermelho", from: "#dc2626", to: "#fca5a5", ring: "#ef4444" },
  { key: "slate", label: "Cinza", from: "#334155", to: "#94a3b8", ring: "#475569" },
];

export function getColor(key?: string | null) {
  return COLOR_PRESETS.find((c) => c.key === key) ?? COLOR_PRESETS[0];
}

export const UNIT_OPTIONS = [
  "Unidade",
  "m",
  "cm",
  "m²",
  "m³",
  "L",
  "Kg",
  "Toneladas",
  "Horas",
  "%",
];

export interface CustomActivityDefinition {
  id: string;
  environment: string;
  title: string;
  icon: string;
  color: string;
  order_index: number;
  config: ActivityConfig;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomActivityDailyReport {
  id: string;
  environment: string;
  definition_id: string;
  report_date: string;
  entries: ActivityEntry[];
  locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Formats a saved daily report into a text block for the main RDO */
export function formatCustomActivityForRDO(
  def: CustomActivityDefinition,
  report: CustomActivityDailyReport | null | undefined,
): string {
  const header = `🏷️ ${def.title.toUpperCase()} 🏷️`;
  if (!report || !report.entries || report.entries.length === 0) {
    return `${header}\n\n⚠️ Nenhuma atividade registrada para esta data.`;
  }
  const byField = new Map<string, ActivityEntry[]>();
  report.entries.forEach((e) => {
    const arr = byField.get(e.field_id) ?? [];
    arr.push(e);
    byField.set(e.field_id, arr);
  });
  const lines: string[] = [header, ""];
  def.config.fields.forEach((f) => {
    const rawItems = byField.get(f.id) ?? [];
    // For check-mode: only include checked entries in the RDO preview
    const items = f.mode === "check" ? rawItems.filter((it) => it.checked) : rawItems;
    if (items.length === 0) return;
    lines.push(`• ${f.name}`);
    items.forEach((it) => {
      if (f.mode === "check") {
        const label = (it.label ?? "").trim() || "Concluído";
        lines.push(
          `   ✓ ${label}${it.location ? ` – ${it.location}` : ""}${it.note ? ` (${it.note})` : ""}`,
        );
      } else {
        const val = (it.value ?? "").toString().trim();
        if (!val) return;
        lines.push(
          `   ${val}${f.unit ? ` ${f.unit}` : ""}${it.location ? ` – ${it.location}` : ""}${
            it.note ? ` (${it.note})` : ""
          }`,
        );
      }
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}
