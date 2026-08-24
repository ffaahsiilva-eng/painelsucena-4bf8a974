// Heuristic gender detection based on Brazilian first names.
// Used only to pick a default avatar image.

const FEMALE_EXCEPTIONS = new Set([
  "beatriz", "cris", "isis", "iris", "ines", "inês", "esther", "ester",
  "raquel", "abigail", "miriam", "myriam", "eliane", "ivone", "carmen",
  "carmem", "solange", "luz", "conceicao", "conceição", "sol",
  // Nomes femininos do efetivo que não terminam em "a"
  "creriane", "danieli", "zediane", "daniele", "danielle", "adriane",
  "cristiane", "juliane", "luciane", "rosiane", "rosane", "simone",
  "sabrine", "sandrine", "karine", "kelly", "keyli", "keli", "keyla",
  "jaqueline", "jacqueline", "madalene", "marlene", "helen", "hellen",
  "gorete", "gorette", "ivete", "elizete", "elisete", "josete",
]);

const MALE_EXCEPTIONS = new Set([
  "joshua", "sasha", "costa", "luca", "yuca", "elias", "matias", "tobias",
  "aias", "isaias", "isaías", "nicola", "andrea", // sometimes male in some cultures
  "jeova", "jeová", "josua", "josué", "josue", "jonas", "silva", "souza",
  "barnaba", "barnabé", "neemias", "jeremias", "zacarias", "ezequias",
  "ezedequias", "urias", "azarias", "ananias", "mefiboseté", "aquila",
]);

export function isLikelyFemaleName(fullName?: string | null): boolean {
  if (!fullName) return false;
  const first = fullName.trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return false;
  if (FEMALE_EXCEPTIONS.has(first)) return true;
  if (MALE_EXCEPTIONS.has(first)) return false;
  // Default heuristic: ends in "a" → female
  return /a$/.test(first);
}
