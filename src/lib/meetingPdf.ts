import { jsPDF } from "jspdf";

export interface MeetingPdfData {
  meetingTitle?: string;
  roomName?: string;
  participants?: string[];
  transcript?: string;
  summary?: string;
  keyPoints?: string[];
  actionItems?: Array<{ task: string; owner?: string }>;
  snapshots?: string[];
  generatedAt?: Date;
}

const MARGIN = 15;
const LINE = 5.5;

async function loadImageAsDataURL(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read-failed"));
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("image-load-failed"));
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch (e) {
    console.warn("loadImageAsDataURL failed", url, e);
    return null;
  }
}

export async function exportMeetingPdf(data: MeetingPdfData, filename = "reuniao.pdf") {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeHeading = (text: string, size = 14) => {
    ensureSpace(LINE + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(20, 20, 20);
    doc.text(text, MARGIN, y);
    y += LINE + 2;
  };

  const writeParagraph = (text: string, size = 10, bold = false) => {
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, usableWidth);
    lines.forEach((line: string) => {
      ensureSpace(LINE);
      doc.text(line, MARGIN, y);
      y += LINE;
    });
  };

  const writeBullet = (text: string) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, usableWidth - 5);
    lines.forEach((line: string, idx: number) => {
      ensureSpace(LINE);
      const prefix = idx === 0 ? "•  " : "    ";
      doc.text(prefix + line, MARGIN, y);
      y += LINE;
    });
  };

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ata de Reunião", MARGIN, 14);
  y = 30;

  if (data.meetingTitle) writeHeading(data.meetingTitle, 13);
  const metaParts: string[] = [];
  if (data.roomName) metaParts.push(`Sala: ${data.roomName}`);
  metaParts.push(`Gerado em: ${(data.generatedAt || new Date()).toLocaleString("pt-BR")}`);
  writeParagraph(metaParts.join("  •  "), 9);

  if (data.participants && data.participants.length > 0) {
    writeParagraph(`Participantes: ${data.participants.join(", ")}`, 9);
  }
  y += 3;

  if (data.summary) {
    writeHeading("Resumo Executivo", 12);
    writeParagraph(data.summary, 10);
    y += 2;
  }

  if (data.keyPoints && data.keyPoints.length > 0) {
    writeHeading("Pontos-Chave", 12);
    data.keyPoints.forEach((pt) => writeBullet(pt));
    y += 2;
  }

  if (data.actionItems && data.actionItems.length > 0) {
    writeHeading("Itens de Ação", 12);
    data.actionItems.forEach((item) => {
      const text = item.owner ? `${item.task}  —  Responsável: ${item.owner}` : item.task;
      writeBullet(text);
    });
    y += 2;
  }

  if (data.snapshots && data.snapshots.length > 0) {
    doc.addPage();
    y = MARGIN;
    writeHeading("Capturas da Reunião", 13);
    const usable = pageWidth - MARGIN * 2;
    for (let i = 0; i < data.snapshots.length; i += 1) {
      const url = data.snapshots[i];
      const img = await loadImageAsDataURL(url);
      if (!img) continue;
      const ratio = img.height / img.width;
      const drawW = usable;
      const drawH = drawW * ratio;
      ensureSpace(drawH + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Captura ${i + 1}`, MARGIN, y);
      y += 4;
      try {
        doc.addImage(img.dataUrl, "JPEG", MARGIN, y, drawW, drawH);
      } catch (e) {
        console.warn("addImage failed", e);
      }
      y += drawH + 6;
    }
  }

  if (data.transcript && data.transcript.trim()) {
    doc.addPage();
    y = MARGIN;
    writeHeading("Transcrição Completa", 13);
    const lines = data.transcript.split(/\r?\n/);
    lines.forEach((ln) => writeParagraph(ln, 9));
  }

  // Rodapé com paginação
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - MARGIN, pageHeight - 6, {
      align: "right",
    });
  }

  doc.save(filename);
}
