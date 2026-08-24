import { EditorState, MapObject } from "./types";

export function exportJson(state: EditorState): string {
  return JSON.stringify({ version: 1, ...state }, null, 2);
}

export function parseJson(raw: string): EditorState | null {
  try {
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.objects) || !Array.isArray(j.layers)) return null;
    return { objects: j.objects, layers: j.layers, selection: [] };
  } catch { return null; }
}

// GeoJSON export using image coordinates (x -> lon, y -> -lat scaled).
// This is planar / not georeferenced — it's a portable structural export.
export function exportGeoJson(state: EditorState): string {
  const features: any[] = [];
  for (const o of state.objects) {
    const props = { id: o.id, name: o.label, type: o.type, color: o.color, layer: o.layerId };
    switch (o.type) {
      case "icon":
      case "number":
      case "text":
        features.push({
          type: "Feature", properties: { ...props, text: (o as any).text ?? (o as any).value ?? (o as any).label },
          geometry: { type: "Point", coordinates: [o.x, o.y] },
        });
        break;
      case "circle":
        features.push({
          type: "Feature", properties: { ...props, radius: o.r },
          geometry: { type: "Point", coordinates: [o.cx, o.cy] },
        });
        break;
      case "line":
      case "route":
      case "measure":
        features.push({
          type: "Feature", properties: props,
          geometry: { type: "LineString", coordinates: o.points.map((p) => [p.x, p.y]) },
        });
        break;
      case "polygon":
        features.push({
          type: "Feature", properties: props,
          geometry: { type: "Polygon", coordinates: [[...o.points.map((p) => [p.x, p.y]), [o.points[0]?.x ?? 0, o.points[0]?.y ?? 0]]] },
        });
        break;
    }
  }
  return JSON.stringify({ type: "FeatureCollection", features }, null, 2);
}

export function downloadFile(name: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function distance(points: { x: number; y: number }[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return d;
}

export function polygonArea(points: { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const j = (i + 1) % n;
    a += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(a) / 2;
}
