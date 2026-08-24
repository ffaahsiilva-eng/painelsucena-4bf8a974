// Parse Ata de Reunião do Contrato PDF text into structured items.
// Items are numbered like "1", "1.1", "2.3", etc. Section headers are integers (no dot).

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ParsedItem {
  item_number: string;
  section: string | null;
  description: string;
  action_by: string | null;
  deadline: string | null;
  original_status: string | null;
  sort_order: number;
}

export interface ParsedAta {
  rawText: string;
  meetingDate: string | null; // YYYY-MM-DD
  items: ParsedItem[];
}

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group items by approximate Y coordinate to preserve lines
    const lines: { y: number; parts: { x: number; str: string }[] }[] = [];
    for (const it of content.items as any[]) {
      const str = (it.str ?? "").toString();
      if (!str.trim()) continue;
      const tr = it.transform as number[];
      const x = tr[4];
      const y = Math.round(tr[5]);
      let line = lines.find((l) => Math.abs(l.y - y) <= 2);
      if (!line) {
        line = { y, parts: [] };
        lines.push(line);
      }
      line.parts.push({ x, str });
    }
    lines.sort((a, b) => b.y - a.y);
    for (const l of lines) {
      l.parts.sort((a, b) => a.x - b.x);
      text += l.parts.map((p) => p.str).join(" ") + "\n";
    }
    text += "\n";
  }
  return text;
}

const SECTION_NAMES: Record<string, string> = {
  "1": "HSE – Segurança do Trabalho e Meio Ambiente",
  "2": "Engenharia",
  "3": "Qualidade",
  "4": "Marcos Contratuais",
  "5": "Planejamento e Controle",
  "6": "Medição",
  "7": "Implantação",
  "8": "Outros",
  "9": "Outros",
};

export function parseAtaText(text: string): { meetingDate: string | null; items: ParsedItem[] } {
  // Detect meeting date: look for "Data: dd/mm/aa" or "Data e hora: dd/mm/yyyy"
  let meetingDate: string | null = null;
  const dm = text.match(/Data(?:\s*e\s*hora)?\s*:\s*(\d{2})\/(\d{2})\/(\d{2,4})/i);
  if (dm) {
    let [, d, mo, y] = dm;
    if (y.length === 2) y = "20" + y;
    meetingDate = `${y}-${mo}-${d}`;
  }

  // Normalize lines
  const rawLines = text.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  // Skip footer/header noise
  const skipPatterns = [
    /^ALUNORTE/i,
    /^Rodovia PA-481/i,
    /^CEP:/i,
    /www\.alunorte/i,
    /Tel:\s*\(/i,
    /Fax:/i,
    /^Bauxite\s*&\s*Alumina$/i,
    /^Resíduos B&A/i,
    /Reunião Interna/i,
    /^Data:\s*\d/i,
    /^Ref\.:/i,
    /^Redigido por/i,
    /^ATA DE REUNIÃO$/i,
    /^Assunto:/i,
    /^Data e hora:/i,
    /^Local:/i,
    /^PARTICIPANTES/i,
    /^ITEM\s+DESCRIÇÃO/i,
  ];

  const items: ParsedItem[] = [];
  let currentSection: string | null = null;
  let currentItem: ParsedItem | null = null;

  // Pattern: starts with a number like "1.10" or "1" followed by content
  const itemRe = /^(\d{1,2}(?:\.\d{1,3})?)\s+(.*)$/;

  // Heuristic: status keywords often appear at line end
  const statusRe = /\b(Em\s*andamento|A\s*iniciar|Conclu[ií]do|Pendente|Info|Informativo|Cancelado)\b\s*$/i;
  const dateRe = /\b(\d{2}\/\d{2}\/\d{2,4})\b/;

  let order = 0;

  const finalize = () => {
    if (currentItem) {
      // Trim extracted status from description if it ends with status word
      currentItem.description = currentItem.description.replace(/\s+/g, " ").trim();
      items.push(currentItem);
      currentItem = null;
    }
  };

  for (const line of rawLines) {
    if (skipPatterns.some((re) => re.test(line))) continue;

    const m = line.match(itemRe);
    if (m) {
      const num = m[1];
      const rest = m[2].trim();

      // Pure section header (no dot) and short title
      if (!num.includes(".") && rest.length > 0 && rest.length < 80 && !/[a-z]/.test(rest.charAt(0))) {
        finalize();
        currentSection = SECTION_NAMES[num] ?? rest;
        continue;
      }

      // It's an item
      finalize();
      let desc = rest;
      let status: string | null = null;
      let deadline: string | null = null;

      const sm = desc.match(statusRe);
      if (sm) {
        status = sm[1];
        desc = desc.replace(statusRe, "").trim();
      }
      const dm2 = desc.match(dateRe);
      if (dm2) {
        deadline = dm2[1];
      }

      currentItem = {
        item_number: num,
        section: currentSection,
        description: desc,
        action_by: null,
        deadline,
        original_status: status,
        sort_order: order++,
      };
    } else if (currentItem) {
      // Continuation line — append to description
      let extra = line;
      const sm = extra.match(statusRe);
      if (sm && !currentItem.original_status) {
        currentItem.original_status = sm[1];
        extra = extra.replace(statusRe, "").trim();
      }
      const dm2 = extra.match(dateRe);
      if (dm2 && !currentItem.deadline) {
        currentItem.deadline = dm2[1];
      }
      if (extra) currentItem.description += " " + extra;
    }
  }
  finalize();

  // Filter out items with empty descriptions
  return {
    meetingDate,
    items: items.filter((i) => i.description && i.description.length >= 3),
  };
}

export async function parseAtaPdf(file: File): Promise<ParsedAta> {
  const rawText = await extractPdfText(file);
  const { meetingDate, items } = parseAtaText(rawText);
  return { rawText, meetingDate, items };
}
