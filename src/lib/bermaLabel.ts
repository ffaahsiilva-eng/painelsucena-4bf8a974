export function bermaLabel(berma: string | number | null | undefined): string {
  if (berma === null || berma === undefined || berma === "") return "";
  const s = String(berma).trim();
  const m = s.match(/^gabiao-(\d+)$/i);
  if (m) return `Gabião ${m[1]}`;
  if (s.toLowerCase() === "mirante") return "Mirante";
  return `Berma ${s}`;
}
