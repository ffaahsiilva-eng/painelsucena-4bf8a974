export type FuelLevelInput = string | null | undefined;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const fuelLevelToLabel = (level: FuelLevelInput): string => {
  if (!level) return "";

  const norm = String(level).trim().toLowerCase();
  const labels: Record<string, string> = {
    empty: "VAZIO",
    quarter: "1/4",
    half: "1/2",
    three_quarters: "3/4",
    full: "CHEIO",
    // common free-form inputs
    "1/4": "1/4",
    "1/2": "1/2",
    "3/4": "3/4",
    e: "VAZIO",
    f: "CHEIO",
    cheio: "CHEIO",
    vazio: "VAZIO",
    meio: "1/2",
  };

  return labels[norm] || String(level);
};

export const fuelLevelToPercentage = (level: FuelLevelInput): number => {
  if (!level) return 0;

  const raw = String(level).trim();
  const norm = raw.toLowerCase();

  // numeric inputs
  if (norm.endsWith("%")) {
    const n = Number.parseFloat(norm.replace("%", ""));
    return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
  }

  const n = Number.parseFloat(norm);
  if (Number.isFinite(n) && norm.match(/^\d+(\.\d+)?$/)) {
    // if user stored 0-1, convert to 0-100
    return n <= 1 ? clamp(n * 100, 0, 100) : clamp(n, 0, 100);
  }

  const map: Record<string, number> = {
    empty: 0,
    quarter: 25,
    half: 50,
    three_quarters: 75,
    full: 100,
    "1/4": 25,
    "1/2": 50,
    "3/4": 75,
    e: 0,
    f: 100,
    vazio: 0,
    cheio: 100,
    meio: 50,
  };

  return map[norm] ?? 0;
};

/**
 * Returns the needle rotation angle (-60 to 60) based on fuel level.
 */
const levelToAngle = (level: string | null | undefined): number => {
  if (!level) return -60;
  const norm = String(level).trim().toLowerCase();

  const map: Record<string, number> = {
    empty: -60,
    quarter: -30,
    "1/4": -30,
    half: 0,
    "1/2": 0,
    three_quarters: 30,
    "3/4": 30,
    full: 60,
    cheio: 60,
    vazio: -60,
    e: -60,
    f: 60,
  };

  return map[norm] ?? -60;
};

/**
 * Returns the highlight color for the arc segment based on fuel level.
 */
const levelToColor = (level: string | null | undefined): string => {
  if (!level) return "#ef4444";
  const norm = String(level).trim().toLowerCase();

  const map: Record<string, string> = {
    empty: "#ef4444",
    quarter: "#f97316",
    "1/4": "#f97316",
    half: "#eab308",
    "1/2": "#eab308",
    three_quarters: "#84cc16",
    "3/4": "#84cc16",
    full: "#22c55e",
    cheio: "#22c55e",
    vazio: "#ef4444",
    e: "#ef4444",
    f: "#22c55e",
  };

  return map[norm] ?? "#ef4444";
};

/**
 * Builds an arc-style fuel gauge SVG identical to the driver panel.
 */
export const buildFuelGaugeSvg = (params: {
  percent?: number;
  level?: string | null;
  width?: number;
  height?: number;
}) => {
  const width = params.width ?? 100;
  const height = params.height ?? 60;

  // Calculate angle from level or percent
  let angle: number;
  let highlightColor: string;

  if (params.level) {
    angle = levelToAngle(params.level);
    highlightColor = levelToColor(params.level);
  } else {
    // Convert percent (0-100) to angle (-60 to 60)
    const pct = clamp(params.percent ?? 0, 0, 100);
    angle = -60 + (pct / 100) * 120;
    // Color based on percent
    if (pct <= 20) highlightColor = "#ef4444";
    else if (pct <= 40) highlightColor = "#f97316";
    else if (pct <= 60) highlightColor = "#eab308";
    else if (pct <= 80) highlightColor = "#84cc16";
    else highlightColor = "#22c55e";
  }

  return `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 120 70"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gauge de combustível"
      role="img"
      style="display:block"
    >
      <!-- Background arc -->
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="#e5e5e5"
        stroke-width="8"
        stroke-linecap="round"
      />
      
      <!-- Colored segments -->
      <path d="M 12 55 A 48 48 0 0 1 28 25" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      <path d="M 32 20 A 48 48 0 0 1 50 12" fill="none" stroke="#f97316" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      <path d="M 54 10 A 48 48 0 0 1 66 10" fill="none" stroke="#eab308" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      <path d="M 70 12 A 48 48 0 0 1 88 20" fill="none" stroke="#84cc16" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      <path d="M 92 25 A 48 48 0 0 1 108 55" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="round" opacity="0.3" />

      <!-- Highlighted segment based on level -->
      ${angle <= -45 ? `<path d="M 12 55 A 48 48 0 0 1 28 25" fill="none" stroke="${highlightColor}" stroke-width="6" stroke-linecap="round" />` : ""}
      ${angle > -45 && angle <= -15 ? `<path d="M 32 20 A 48 48 0 0 1 50 12" fill="none" stroke="${highlightColor}" stroke-width="6" stroke-linecap="round" />` : ""}
      ${angle > -15 && angle <= 15 ? `<path d="M 54 10 A 48 48 0 0 1 66 10" fill="none" stroke="${highlightColor}" stroke-width="6" stroke-linecap="round" />` : ""}
      ${angle > 15 && angle <= 45 ? `<path d="M 70 12 A 48 48 0 0 1 88 20" fill="none" stroke="${highlightColor}" stroke-width="6" stroke-linecap="round" />` : ""}
      ${angle > 45 ? `<path d="M 92 25 A 48 48 0 0 1 108 55" fill="none" stroke="${highlightColor}" stroke-width="6" stroke-linecap="round" />` : ""}

      <!-- E and F labels -->
      <text x="8" y="48" font-size="9" font-family="Arial" fill="#666" font-weight="bold">E</text>
      <text x="106" y="48" font-size="9" font-family="Arial" fill="#666" font-weight="bold">F</text>

      <!-- Center pivot -->
      <circle cx="60" cy="60" r="6" fill="#fff" stroke="#ccc" stroke-width="2" />

      <!-- Needle pointer -->
      <g transform="rotate(${angle}, 60, 60)">
        <line x1="60" y1="60" x2="60" y2="20" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
        <polygon points="60,12 55,22 65,22" fill="#ef4444" />
      </g>

      <!-- Center circle overlay -->
      <circle cx="60" cy="60" r="4" fill="#ef4444" />
    </svg>
  `;
};
