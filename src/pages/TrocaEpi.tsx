import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEpiExchanges, EpiExchange } from "@/hooks/useEpiExchanges";
import { useMaterialRequisitions, MaterialRequisition } from "@/hooks/useMaterialRequisitions";
import { useInventoryItems } from "@/hooks/useInventory";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { SignatureDialog } from "@/components/epi/SignatureDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Plus, FileText, Trash2, Eye, Pencil, Image, MessageCircle, Search, ChevronLeft, ChevronRight, X, Camera, ZoomIn, Loader2, Package, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { compressImage } from "@/utils/imageCompression";


const EPI_ITEMS = [
  { id: "abafador_completo", label: "Abafador Completo", hasInput: false },
  { id: "armacao_oculos", label: "Armação do Óculos Ampla Visão", hasInput: false },
  { id: "bota_couro", label: "Bota de Couro", hasInput: true, inputLabel: "Nº" },
  { id: "bota_7leguas", label: "Bota 7 Léguas", hasInput: true, inputLabel: "Nº" },
  { id: "luva", label: "Luva", hasInput: true, inputLabel: "Tipo" },
  { id: "capacete", label: "Capacete", hasInput: false },
  { id: "carneira", label: "Carneira", hasInput: false },
  { id: "colete", label: "Colete", hasInput: false },
  { id: "lente_protetor_facial", label: "Lente do Protetor Facial", hasInput: false },
  { id: "lente_escura", label: "Lente Escura", hasInput: false },
  { id: "tyveck", label: "Tyveck", hasInput: false },
  { id: "liga_oculos", label: "Liga do Óculos Ampla Visão", hasInput: false },
  { id: "mascara_pff2", label: "Máscara PFF 2", hasInput: false },
  { id: "oculos_ampla_visao", label: "Óculos Ampla Visão Completo", hasInput: false },
  { id: "suporte_abafador", label: "Suporte do Abafador", hasInput: false },
  { id: "suporte_protetor_facial", label: "Suporte do Protetor Facial", hasInput: false },
  { id: "perneira", label: "Perneira", hasInput: false },
  { id: "outros", label: "Outros", hasInput: true, inputLabel: "Especifique" },
];

const INVENTORY_DROPDOWN_EPIS: Record<string, { keyword: string; placeholder: string }> = {
  luva: { keyword: "luva", placeholder: "Selecione o tipo de luva..." },
  bota_7leguas: { keyword: "7 legua", placeholder: "Selecione a bota 7 léguas..." },
  bota_couro: { keyword: "bota de segur", placeholder: "Selecione a bota..." },
  lente_protetor_facial: { keyword: "lente", placeholder: "Selecione a lente..." },
  lente_escura: { keyword: "lente escura", placeholder: "Selecione a lente escura..." },
  capacete: { keyword: "capacete", placeholder: "Selecione o capacete do estoque..." },
};

const TAMANHOS = ["P", "M", "G", "GG", "XG"];

const AREA_DESTINO_OPTIONS = ["Gabião", "Jardinagem", "Transporte", "Escritório"];

// EPI category keywords to filter OUT for material tab
const EPI_KEYWORDS = ["epi", "luva", "bota", "capacete", "carneira", "colete", "protetor", "óculos", "oculos", "abafador", "perneira", "tyveck", "pff", "máscara", "mascara"];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ExchangeSharePayload = {
  description: string;
  file: File;
  fileName: string;
  title: string;
};

let logoBase64Promise: Promise<string> | null = null;
let logoBase64Value: string | null = null;

function loadCachedLogoBase64() {
  if (logoBase64Value) return Promise.resolve(logoBase64Value);

  if (!logoBase64Promise) {
    logoBase64Promise = getLogoBase64()
      .then((value) => {
        if (value) {
          logoBase64Value = value;
        } else {
          logoBase64Promise = null;
        }
        return value;
      })
      .catch(() => {
        logoBase64Promise = null;
        return "";
      });
  }

  return logoBase64Promise;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadRequiredLogoBase64() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const logoBase64 = await loadCachedLogoBase64();
    if (logoBase64) return logoBase64;
    await delay(180);
  }

  throw new Error("Logo não carregada para gerar o PNG");
}

function sanitizeShareFileName(value: string) {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "requisicao";
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64 = ""] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mime, lastModified: Date.now() });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDocumentDate(value: string): string {
  return format(new Date(`${value}T12:00:00`), "dd/MM/yyyy");
}

function renderSignatureBlock(signature: string | null | undefined, label: string): string {
  return `
    <div style="text-align:center;width:45%;">
      ${signature ? `<img loading="lazy" decoding="async" src="${signature}" style="display:block;margin:0 auto;max-height:60px;max-width:260px;object-fit:contain;" />` : '<div style="height:70px;"></div>'}
      <div style="border-top:1px solid #333;padding-top:14px;font-size:12px;letter-spacing:0;text-transform:uppercase;">${label}</div>
    </div>
  `;
}

type FormalRequisitionRenderParams = {
  title: string;
  sectionTitle: string;
  logoBase64: string;
  date: string;
  areaDestino?: string;
  autorizadoPor: string;
  matriculaAutorizador?: string | null;
  motivo: string;
  funcionarioNome: string;
  funcionarioFuncao?: string | null;
  funcionarioMatricula?: string | null;
  items: Array<{ name: string; qty: number }>;
  assinaturaFuncionario?: string | null;
  assinaturaAutorizador?: string | null;
  requireLogo?: boolean;
  requireSignatures?: boolean;
};

function loadSingleImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.decoding = "sync";
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";

    let settled = false;
    const finish = async (ok: boolean) => {
      if (settled) return;
      settled = true;

      if (!ok || !img.naturalWidth || !img.naturalHeight) {
        resolve(null);
        return;
      }

      try {
        if (typeof img.decode === "function") await img.decode();
      } catch {
        // onload already confirmed the image is usable for canvas
      }

      resolve(img.naturalWidth && img.naturalHeight ? img : null);
    };

    img.onload = () => void finish(true);
    img.onerror = () => resolve(null);
    img.src = src;
    if (img.complete) void finish(true);
    setTimeout(() => void finish(false), 5000);
  });
}

async function loadImageForCanvas(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const img = await loadSingleImageForCanvas(src);
    if (img) return img;
    await delay(120);
  }

  return null;
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: "left" | "center" = "center",
) {
  const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * ratio;
  const h = img.naturalHeight * ratio;
  const dx = align === "left" ? x : x + (maxW - w) / 2;
  const dy = y + (maxH - h) / 2;
  ctx.drawImage(img, dx, dy, w, h);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function drawField(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, w: number) {
  ctx.strokeStyle = "#9b9b9b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x + w, y + 22);
  ctx.stroke();

  ctx.fillStyle = "#242424";
  ctx.font = "700 16px Arial, Helvetica, sans-serif";
  const labelText = `${label}: `;
  ctx.fillText(labelText, x + 4, y + 16);
  const labelWidth = ctx.measureText(labelText).width;
  ctx.font = "400 16px Arial, Helvetica, sans-serif";
  ctx.fillText(fitText(ctx, value, w - labelWidth - 8), x + 4 + labelWidth, y + 16);
}

function hasNonWhitePixels(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number, threshold = 8): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.min(canvas.width - sx, Math.ceil(w));
  const sh = Math.min(canvas.height - sy, Math.ceil(h));
  if (sw <= 0 || sh <= 0) return false;

  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a > 0 && (r < 245 || g < 245 || b < 245)) {
      count += 1;
      if (count >= threshold) return true;
    }
  }

  return false;
}

async function generateFormalRequisitionPngFile(params: FormalRequisitionRenderParams, fileName: string): Promise<File> {
  const [logo, assinaturaAutorizador, assinaturaFuncionario] = await Promise.all([
    loadImageForCanvas(params.logoBase64),
    loadImageForCanvas(params.assinaturaAutorizador),
    loadImageForCanvas(params.assinaturaFuncionario),
  ]);

  if (params.requireLogo && !logo) throw new Error("Logo não carregada no PNG");
  if (params.requireSignatures && (!assinaturaAutorizador || !assinaturaFuncionario)) {
    throw new Error("Assinaturas não carregadas no PNG");
  }

  const items = params.items.length > 0 ? params.items : [{ name: "—", qty: 0 }];
  const width = 980;
  const margin = 28;
  const rowHeight = 42;
  const tableHeaderHeight = 40;
  const tableTop = 466;
  const tableHeight = tableHeaderHeight + items.length * rowHeight;
  const signatureTop = tableTop + tableHeight + 58;
  const height = Math.max(680, signatureTop + 118);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#2f2f2f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin, 108);
  ctx.lineTo(width - margin, 108);
  ctx.stroke();

  if (logo) drawContainedImage(ctx, logo, margin, 24, 240, 70, "left");
  ctx.fillStyle = "#666666";
  ctx.font = "400 14px Arial, Helvetica, sans-serif";
  const contract = "CONTRATO: 4600012690";
  ctx.fillText(contract, width - margin - ctx.measureText(contract).width, 64);

  ctx.fillStyle = "#242424";
  ctx.font = "700 24px Arial, Helvetica, sans-serif";
  const title = params.title.toUpperCase();
  ctx.fillText(title, (width - ctx.measureText(title).width) / 2, 168);

  const colW = (width - margin * 2 - 18) / 2;
  drawField(ctx, "DATA", formatDocumentDate(params.date), margin, 208, colW);
  drawField(ctx, "ÁREA DESTINO", params.areaDestino || "Almoxarifado", margin + colW + 18, 208, colW);
  drawField(ctx, "AUTORIZADO POR", params.autorizadoPor, margin, 252, colW);
  drawField(ctx, "MATRÍCULA", params.matriculaAutorizador || "", margin + colW + 18, 252, colW);
  drawField(ctx, "MOTIVO", params.motivo, margin, 296, width - margin * 2);
  drawField(ctx, "FUNCIONÁRIO(A)", params.funcionarioNome, margin, 340, width - margin * 2);
  drawField(ctx, "FUNÇÃO", params.funcionarioFuncao || "", margin, 384, colW);
  drawField(ctx, "MATRÍCULA", params.funcionarioMatricula || "", margin + colW + 18, 384, colW);

  const sectionTop = tableTop - 38;
  ctx.fillStyle = "#e1e4e8";
  ctx.fillRect(margin, sectionTop, width - margin * 2, 38);
  ctx.fillStyle = "#242424";
  ctx.font = "700 18px Arial, Helvetica, sans-serif";
  ctx.fillText(params.sectionTitle.toUpperCase(), margin + 12, sectionTop + 25);

  const qtyW = 144;
  const itemW = width - margin * 2 - qtyW;
  ctx.strokeStyle = "#cfcfcf";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#f0f1f3";
  ctx.fillRect(margin, tableTop, itemW, tableHeaderHeight);
  ctx.fillRect(margin + itemW, tableTop, qtyW, tableHeaderHeight);
  ctx.strokeRect(margin, tableTop, itemW, tableHeaderHeight);
  ctx.strokeRect(margin + itemW, tableTop, qtyW, tableHeaderHeight);
  ctx.fillStyle = "#242424";
  ctx.font = "700 14px Arial, Helvetica, sans-serif";
  ctx.fillText(params.sectionTitle === "MATERIAIS" ? "Material" : "EPI / Uniforme", margin + 12, tableTop + 25);
  const qtd = "Qtd";
  ctx.fillText(qtd, margin + itemW + (qtyW - ctx.measureText(qtd).width) / 2, tableTop + 25);

  ctx.font = "400 15px Arial, Helvetica, sans-serif";
  items.forEach((item, index) => {
    const y = tableTop + tableHeaderHeight + index * rowHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(margin, y, itemW, rowHeight);
    ctx.fillRect(margin + itemW, y, qtyW, rowHeight);
    ctx.strokeStyle = "#cfcfcf";
    ctx.strokeRect(margin, y, itemW, rowHeight);
    ctx.strokeRect(margin + itemW, y, qtyW, rowHeight);
    ctx.fillStyle = "#242424";
    ctx.fillText(fitText(ctx, String(item.name || "—").toUpperCase(), itemW - 24), margin + 12, y + 26);
    const qtyText = String(item.qty || 1);
    ctx.fillText(qtyText, margin + itemW + (qtyW - ctx.measureText(qtyText).width) / 2, y + 26);
  });

  const sigW = 395;
  const leftSigX = margin + 35;
  const rightSigX = width - margin - 35 - sigW;
  const drawSignature = (img: HTMLImageElement | null, label: string, x: number) => {
    if (img) drawContainedImage(ctx, img, x + 55, signatureTop - 62, sigW - 110, 60);
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, signatureTop + 10);
    ctx.lineTo(x + sigW, signatureTop + 10);
    ctx.stroke();
    ctx.fillStyle = "#242424";
    ctx.font = "400 11px Arial, Helvetica, sans-serif";
    const labelText = label.toUpperCase();
    ctx.fillText(labelText, x + (sigW - ctx.measureText(labelText).width) / 2, signatureTop + 46);
  };

  drawSignature(assinaturaAutorizador, "ASSINATURA DO AUTORIZADOR", leftSigX);
  drawSignature(assinaturaFuncionario, "ASSINATURA DO FUNCIONÁRIO", rightSigX);

  if (params.requireLogo && !hasNonWhitePixels(canvas, margin * scale, 24 * scale, 240 * scale, 70 * scale, 40)) {
    throw new Error("Logo não desenhada no PNG");
  }

  if (params.requireSignatures) {
    const authDrawn = hasNonWhitePixels(canvas, (leftSigX + 55) * scale, (signatureTop - 62) * scale, (sigW - 110) * scale, 60 * scale, 8);
    const employeeDrawn = hasNonWhitePixels(canvas, (rightSigX + 55) * scale, (signatureTop - 62) * scale, (sigW - 110) * scale, 60 * scale, 8);
    if (!authDrawn || !employeeDrawn) throw new Error("Assinaturas não desenhadas no PNG");
  }

  const dataUrl = canvas.toDataURL("image/png");
  if (!dataUrl || dataUrl === "data:," || isCanvasLikelyBlank(canvas)) throw new Error("PNG vazio");
  const file = dataUrlToFile(dataUrl, fileName);
  if (file.size < 20_000) throw new Error(`PNG inválido (${file.size} bytes)`);
  return file;
}

function buildFormalRequisitionHtml(params: FormalRequisitionRenderParams) {
  const rows = params.items.map((item) => `
    <tr>
      <td style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;line-height:1.25;text-transform:uppercase;">${escapeHtml(item.name)}</td>
      <td style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;text-align:center;width:140px;">${escapeHtml(item.qty || 1)}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;width:100%;min-height:640px;color:#242424;background:#fff;border:2px solid #333;padding:20px 20px 18px;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:18px;margin-bottom:28px;">
        ${params.logoBase64 ? `<img loading="lazy" decoding="async" src="${params.logoBase64}" style="height:76px;max-width:230px;object-fit:contain;" />` : '<div style="height:76px;width:230px;"></div>'}
        <div style="font-size:14px;color:#666;letter-spacing:0;text-transform:uppercase;">CONTRATO: 4600012690</div>
      </div>

      <div style="text-align:center;font-size:22px;font-weight:700;letter-spacing:0;text-transform:uppercase;margin:0 0 24px;">${escapeHtml(params.title)}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:14px;row-gap:18px;font-size:16px;margin-bottom:18px;">
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>DATA:</strong> ${escapeHtml(formatDocumentDate(params.date))}</div>
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>ÁREA DESTINO:</strong> ${escapeHtml(params.areaDestino || "Almoxarifado")}</div>
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>AUTORIZADO POR:</strong> ${escapeHtml(params.autorizadoPor)}</div>
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>MATRÍCULA:</strong> ${escapeHtml(params.matriculaAutorizador || "")}</div>
      </div>

      <div style="border-bottom:1px solid #999;padding:0 4px 3px;font-size:16px;margin-bottom:18px;"><strong>MOTIVO:</strong> ${escapeHtml(params.motivo)}</div>
      <div style="border-bottom:1px solid #999;padding:0 4px 3px;font-size:16px;margin-bottom:18px;"><strong>FUNCIONÁRIO(A):</strong> ${escapeHtml(params.funcionarioNome)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:14px;font-size:16px;margin-bottom:14px;">
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>FUNÇÃO:</strong> ${escapeHtml(params.funcionarioFuncao || "")}</div>
        <div style="border-bottom:1px solid #999;padding:0 4px 3px;"><strong>MATRÍCULA:</strong> ${escapeHtml(params.funcionarioMatricula || "")}</div>
      </div>

      <div style="font-weight:700;font-size:18px;background:#e1e4e8;padding:11px 12px;margin:0 0 10px;text-transform:uppercase;">${escapeHtml(params.sectionTitle)}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:44px;table-layout:fixed;">
        <thead>
          <tr>
            <th style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;text-align:left;background:#f0f1f3;">${escapeHtml(params.sectionTitle === "MATERIAIS" ? "Material" : "EPI / Uniforme")}</th>
            <th style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;text-align:center;background:#f0f1f3;width:140px;">Qtd</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;">—</td><td style="border:1px solid #cfcfcf;padding:10px 12px;font-size:14px;text-align:center;width:140px;">0</td></tr>'}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;">
        ${renderSignatureBlock(params.assinaturaAutorizador, "ASSINATURA DO AUTORIZADOR")}
        ${renderSignatureBlock(params.assinaturaFuncionario, "ASSINATURA DO FUNCIONÁRIO")}
      </div>
    </div>
  `;
}

function isCanvasLikelyBlank(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    const width = canvas.width;
    const height = canvas.height;
    const stepX = Math.max(1, Math.floor(width / 80));
    const stepY = Math.max(1, Math.floor(height / 80));
    let nonWhitePixels = 0;

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (a > 0 && (r < 245 || g < 245 || b < 245)) nonWhitePixels += 1;
        if (nonWhitePixels > 25) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function buildExchangeShareDescription(exchange: EpiExchange) {
  const episList = (exchange.epis || [])
    .map((e: any) => {
      const epiId = typeof e === "string" ? e : e.id;
      const epiQty = typeof e === "object" && e.qty ? Number(e.qty) : 1;
      const epiValue = typeof e === "object" ? e.value : undefined;
      const isOutros = epiId === "outros" || epiId.startsWith("outros_");
      const hasDropdown = isOutros || !!INVENTORY_DROPDOWN_EPIS[epiId];
      const epiItem = isOutros ? EPI_ITEMS.find((item) => item.id === "outros") : EPI_ITEMS.find((item) => item.id === epiId);
      const baseLabel = epiItem?.label || epiId;
      const name = epiValue
        ? (hasDropdown ? epiValue : `${baseLabel} ${epiItem?.inputLabel || ""} ${epiValue}`.replace(/\s+/g, " ").trim())
        : baseLabel;

      return `${name} (${epiQty})`;
    })
    .join(", ");

  const dataFormatada = (() => {
    try {
      return format(new Date(`${exchange.data}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return exchange.data;
    }
  })();

  const lines: string[] = [];
  lines.push(`🦺 *TROCA DE EPI*`);
  lines.push("");
  lines.push(`📅 *Data:* ${dataFormatada}`);
  lines.push(`👤 *Funcionário:* ${exchange.funcionario_nome}`);
  if (exchange.funcionario_funcao) lines.push(`💼 *Função:* ${exchange.funcionario_funcao}`);
  if (exchange.funcionario_matricula) lines.push(`🆔 *Matrícula:* ${exchange.funcionario_matricula}`);
  if (exchange.motivo_troca) lines.push(`📝 *Motivo:* ${exchange.motivo_troca}`);
  lines.push(`✅ *Autorizado por:* ${exchange.autorizado_por}${exchange.matricula_autorizador ? ` (${exchange.matricula_autorizador})` : ""}`);

  if (episList) {
    lines.push("");
    lines.push(`*Itens:*`);
    (exchange.epis || []).forEach((e: any) => {
      const epiId = typeof e === "string" ? e : e.id;
      const epiQty = typeof e === "object" && e.qty ? Number(e.qty) : 1;
      const epiValue = typeof e === "object" ? e.value : undefined;
      const isOutros = epiId === "outros" || epiId.startsWith("outros_");
      const hasDropdown = isOutros || !!INVENTORY_DROPDOWN_EPIS[epiId];
      const epiItem = isOutros ? EPI_ITEMS.find((item) => item.id === "outros") : EPI_ITEMS.find((item) => item.id === epiId);
      const baseLabel = epiItem?.label || epiId;
      const name = epiValue
        ? (hasDropdown ? epiValue : `${baseLabel} ${epiItem?.inputLabel || ""} ${epiValue}`.replace(/\s+/g, " ").trim())
        : baseLabel;
      lines.push(`• ${name} (${epiQty})`);
    });
  }

  const uniformeParts: string[] = [];
  if (exchange.uniforme_blusa_quantidade && exchange.uniforme_blusa_quantidade > 0) {
    uniformeParts.push(`Camisa ${exchange.uniforme_blusa_tamanho || "N/I"} (${exchange.uniforme_blusa_quantidade})`);
  }
  if (exchange.uniforme_calca_quantidade && exchange.uniforme_calca_quantidade > 0) {
    uniformeParts.push(`Calça ${exchange.uniforme_calca_tamanho || "N/I"} (${exchange.uniforme_calca_quantidade})`);
  }
  if (uniformeParts.length > 0) {
    lines.push("");
    lines.push(`*Uniforme:*`);
    uniformeParts.forEach((u) => lines.push(`• ${u}`));
  }

  return lines.join("\n");
}

function getExchangeDocumentItems(exchange: EpiExchange): Array<{ name: string; qty: number }> {
  const epiItems = (exchange.epis || []).map((e: any) => {
    const epiId = typeof e === "string" ? e : e.id;
    const epiQty = typeof e === "object" && e.qty ? Number(e.qty) : 1;
    const epiValue = typeof e === "object" ? e.value : undefined;
    const isOutros = epiId === "outros" || epiId.startsWith("outros_");
    const hasDropdown = isOutros || !!INVENTORY_DROPDOWN_EPIS[epiId];
    const epiItem = isOutros ? EPI_ITEMS.find((item) => item.id === "outros") : EPI_ITEMS.find((item) => item.id === epiId);
    const baseLabel = epiItem?.label || epiId;
    const baseName = epiValue
      ? (hasDropdown ? epiValue : `${baseLabel} ${epiItem?.inputLabel || ""} ${epiValue}`.replace(/\s+/g, " ").trim())
      : baseLabel;

    return { name: baseName, qty: epiQty };
  });

  if (exchange.uniforme_blusa_quantidade && exchange.uniforme_blusa_quantidade > 0) {
    epiItems.push({ name: `CAMISA OPERACIONAL${exchange.uniforme_blusa_tamanho ? ` - ${exchange.uniforme_blusa_tamanho}` : ""}`, qty: exchange.uniforme_blusa_quantidade });
  }

  if (exchange.uniforme_calca_quantidade && exchange.uniforme_calca_quantidade > 0) {
    epiItems.push({ name: `CALÇA OPERACIONAL${exchange.uniforme_calca_tamanho ? ` - ${exchange.uniforme_calca_tamanho}` : ""}`, qty: exchange.uniforme_calca_quantidade });
  }

  return epiItems;
}

function getExchangeShareKey(exchange: EpiExchange) {
  return JSON.stringify({
    id: exchange.id,
    created_at: exchange.created_at,
    data: exchange.data,
    autorizado_por: exchange.autorizado_por,
    matricula_autorizador: exchange.matricula_autorizador,
    motivo_troca: exchange.motivo_troca,
    funcionario_nome: exchange.funcionario_nome,
    funcionario_funcao: exchange.funcionario_funcao,
    funcionario_matricula: exchange.funcionario_matricula,
    epis: exchange.epis,
    uniforme_blusa_tamanho: exchange.uniforme_blusa_tamanho,
    uniforme_blusa_quantidade: exchange.uniforme_blusa_quantidade,
    uniforme_calca_tamanho: exchange.uniforme_calca_tamanho,
    uniforme_calca_quantidade: exchange.uniforme_calca_quantidade,
    assinatura_funcionario: exchange.assinatura_funcionario,
    assinatura_autorizador: exchange.assinatura_autorizador,
  });
}

function findInventoryMatch(inventoryItems: any[], searchLabel: string): any | null {
  const normalized = normalizeText(searchLabel);
  let match = inventoryItems.find(inv => normalizeText(inv.name) === normalized);
  if (match) return match;
  match = inventoryItems.find(inv => {
    const invNorm = normalizeText(inv.name);
    return invNorm.includes(normalized) || normalized.includes(invNorm);
  });
  if (match) return match;
  const words = normalized.split(" ").filter(w => w.length >= 3);
  if (words.length > 0) {
    match = inventoryItems.find(inv => {
      const invNorm = normalizeText(inv.name);
      return words.every(w => invNorm.includes(w));
    });
  }
  return match || null;
}

function buildPdfHtml(exchange: EpiExchange, logoBase64: string): string {
  return buildFormalRequisitionHtml({
    title: "Requisição de EPI",
    sectionTitle: "EPI",
    logoBase64,
    date: exchange.data,
    areaDestino: "Almoxarifado",
    autorizadoPor: exchange.autorizado_por,
    matriculaAutorizador: exchange.matricula_autorizador,
    motivo: exchange.motivo_troca,
    funcionarioNome: exchange.funcionario_nome,
    funcionarioFuncao: exchange.funcionario_funcao,
    funcionarioMatricula: exchange.funcionario_matricula,
    items: getExchangeDocumentItems(exchange),
    assinaturaFuncionario: exchange.assinatura_funcionario,
    assinaturaAutorizador: exchange.assinatura_autorizador,
  });
}

function buildMaterialPdfHtml(req: MaterialRequisition, logoBase64: string): string {
  const materiais = req.materiais || [];

  return buildFormalRequisitionHtml({
    title: "Requisição de Material",
    sectionTitle: "MATERIAIS",
    logoBase64,
    date: req.data,
    areaDestino: req.area_destino,
    autorizadoPor: req.autorizado_por,
    matriculaAutorizador: req.matricula_autorizador,
    motivo: req.motivo,
    funcionarioNome: req.funcionario_nome,
    funcionarioFuncao: req.funcionario_funcao,
    funcionarioMatricula: req.funcionario_matricula,
    items: materiais.map((m) => ({ name: m.name, qty: m.qty })),
    assinaturaFuncionario: req.assinatura_funcionario,
    assinaturaAutorizador: req.assinatura_autorizador,
  });
}

function buildMaterialShareDescription(req: MaterialRequisition) {
  const itensTxt = (req.materiais || []).map((m) => `• ${m.name} (${m.qty})`).join("\n");
  const dataFmt = (() => {
    try {
      return format(new Date(`${req.data}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return req.data;
    }
  })();
  const lines = [
    `📦 *REQUISIÇÃO DE MATERIAL*`,
    ``,
    `📅 *Data:* ${dataFmt}`,
    `👤 *Funcionário:* ${req.funcionario_nome}`,
  ];

  if (req.funcionario_funcao) lines.push(`💼 *Função:* ${req.funcionario_funcao}`);
  if (req.funcionario_matricula) lines.push(`🆔 *Matrícula:* ${req.funcionario_matricula}`);
  lines.push(`📍 *Área de destino:* ${req.area_destino}`);
  lines.push(`📝 *Motivo:* ${req.motivo}`);
  lines.push(`✅ *Autorizado por:* ${req.autorizado_por}${req.matricula_autorizador ? ` (${req.matricula_autorizador})` : ""}`);
  lines.push(``);
  lines.push(`*Itens:*`);
  lines.push(itensTxt || "—");

  return lines.join("\n");
}

async function generatePdf(exchange: EpiExchange, logoBase64: string) {
  const content = buildPdfHtml(exchange, logoBase64);
  const html = `<html><head><style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;}</style></head><body>${content}</body></html>`;
  await downloadPdfFromHtml(html, `troca-epi-${exchange.id}.pdf`);
}

async function generateMaterialPdf(req: MaterialRequisition, logoBase64: string) {
  const content = buildMaterialPdfHtml(req, logoBase64);
  const html = `<html><head><style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;}</style></head><body>${content}</body></html>`;
  await downloadPdfFromHtml(html, `requisicao-material-${req.id}.pdf`);
}

export default function TrocaEpi() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { exchanges, isLoading, createExchange, updateExchange, deleteExchange } = useEpiExchanges();
  const { requisitions, isLoading: isLoadingMaterial, createRequisition, updateRequisition, deleteRequisition } = useMaterialRequisitions();
  const { data: inventoryItems = [] } = useInventoryItems();
  const queryClient = useQueryClient();
  const { data: rhData } = useRHEfetivo();
  const efetivo = useMemo(() => {
    if (!rhData) return [];
    const deletedIds = new Set(rhData.deletedIds || []);
    return rhData.colaboradores
      .filter(c => !deletedIds.has(c.id))
      .map(c => ({
        id: String(c.id),
        nome: c.nome,
        funcao: c.funcao || "",
        matricula: c.matricula || "",
        matriculaHydro: c.matriculaHydro || "",
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  // Material items (non-EPI from inventory)
  const materialItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const norm = normalizeText(item.name);
      const catNorm = normalizeText(item.category || "");
      // Exclude items that are EPI category
      if (catNorm === "epi" || catNorm === "epis") return false;
      // Exclude items matching EPI keywords
      return !EPI_KEYWORDS.some(kw => norm.includes(kw));
    }).filter(item => item.quantity > 0);
  }, [inventoryItems]);

  const camisaOptions = useMemo(() => {
    return inventoryItems.filter(inv => normalizeText(inv.name).includes("camisa") && inv.quantity > 0);
  }, [inventoryItems]);

  const calcaOptions = useMemo(() => {
    return inventoryItems.filter(inv => normalizeText(inv.name).includes("calca") && inv.quantity > 0);
  }, [inventoryItems]);

  const sharePayloadCacheRef = useRef(new Map<string, ExchangeSharePayload>());
  const sharePayloadPromiseRef = useRef(new Map<string, Promise<ExchangeSharePayload>>());

  useEffect(() => {
    void loadCachedLogoBase64();
  }, []);

  const buildExchangeSharePayload = useCallback(async (exchange: EpiExchange): Promise<ExchangeSharePayload> => {
    const logoBase64 = await loadRequiredLogoBase64();
    const fileName = `troca-epi-${sanitizeShareFileName(exchange.funcionario_nome)}.png`;
    const file = await generateFormalRequisitionPngFile({
      title: "Requisição de EPI",
      sectionTitle: "EPI",
      logoBase64,
      date: exchange.data,
      areaDestino: "Almoxarifado",
      autorizadoPor: exchange.autorizado_por,
      matriculaAutorizador: exchange.matricula_autorizador,
      motivo: exchange.motivo_troca,
      funcionarioNome: exchange.funcionario_nome,
      funcionarioFuncao: exchange.funcionario_funcao,
      funcionarioMatricula: exchange.funcionario_matricula,
      items: getExchangeDocumentItems(exchange),
      assinaturaFuncionario: exchange.assinatura_funcionario,
      assinaturaAutorizador: exchange.assinatura_autorizador,
      requireLogo: true,
      requireSignatures: true,
    }, fileName);

    return {
      description: buildExchangeShareDescription(exchange),
      file,
      fileName,
      title: `Troca de EPI - ${exchange.funcionario_nome}`,
    };
  }, []);

  const getExchangeSharePayload = useCallback((exchange: EpiExchange) => {
    const shareKey = getExchangeShareKey(exchange);
    const cachedPayload = sharePayloadCacheRef.current.get(shareKey);

    if (cachedPayload) {
      return Promise.resolve(cachedPayload);
    }

    const pendingPayload = sharePayloadPromiseRef.current.get(shareKey);

    if (pendingPayload) {
      return pendingPayload;
    }

    const payloadPromise = buildExchangeSharePayload(exchange)
      .then((payload) => {
        sharePayloadCacheRef.current.set(shareKey, payload);
        sharePayloadPromiseRef.current.delete(shareKey);
        return payload;
      })
      .catch((error) => {
        sharePayloadPromiseRef.current.delete(shareKey);
        throw error;
      });

    sharePayloadPromiseRef.current.set(shareKey, payloadPromise);

    return payloadPromise;
  }, [buildExchangeSharePayload]);

  const buildMaterialSharePayload = useCallback(async (req: MaterialRequisition): Promise<ExchangeSharePayload> => {
    const logoBase64 = await loadRequiredLogoBase64();
    const fileName = `requisicao-material-${sanitizeShareFileName(req.funcionario_nome)}.png`;
    const file = await generateFormalRequisitionPngFile({
      title: "Requisição de Material",
      sectionTitle: "MATERIAIS",
      logoBase64,
      date: req.data,
      areaDestino: req.area_destino,
      autorizadoPor: req.autorizado_por,
      matriculaAutorizador: req.matricula_autorizador,
      motivo: req.motivo,
      funcionarioNome: req.funcionario_nome,
      funcionarioFuncao: req.funcionario_funcao,
      funcionarioMatricula: req.funcionario_matricula,
      items: (req.materiais || []).map((m) => ({ name: m.name, qty: m.qty })),
      assinaturaFuncionario: req.assinatura_funcionario,
      assinaturaAutorizador: req.assinatura_autorizador,
      requireLogo: true,
      requireSignatures: true,
    }, fileName);

    return {
      description: buildMaterialShareDescription(req),
      file,
      fileName,
      title: `Requisição de Material - ${req.funcionario_nome}`,
    };
  }, []);

  const primeExchangeSharePayload = useCallback((exchange: EpiExchange) => {
    const shareKey = getExchangeShareKey(exchange);

    if (sharePayloadCacheRef.current.has(shareKey) || sharePayloadPromiseRef.current.has(shareKey)) {
      return;
    }

    void getExchangeSharePayload(exchange);
  }, [getExchangeSharePayload]);

  useEffect(() => {
    const validKeys = new Set((exchanges || []).map(getExchangeShareKey));

    Array.from(sharePayloadCacheRef.current.keys()).forEach((key) => {
      if (!validKeys.has(key)) {
        sharePayloadCacheRef.current.delete(key);
      }
    });

    Array.from(sharePayloadPromiseRef.current.keys()).forEach((key) => {
      if (!validKeys.has(key)) {
        sharePayloadPromiseRef.current.delete(key);
      }
    });
  }, [exchanges]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return;
    }

    (exchanges || []).slice(0, 2).forEach((exchange) => {
      primeExchangeSharePayload(exchange);
    });
  }, [exchanges, primeExchangeSharePayload]);

  const [activeTab, setActiveTab] = useState("epi");
  const [showForm, setShowForm] = useState(false);
  const [editingExchange, setEditingExchange] = useState<EpiExchange | null>(null);
  const [viewExchange, setViewExchange] = useState<EpiExchange | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [funcPopoverOpen, setFuncPopoverOpen] = useState(false);
  const [authPopoverOpen, setAuthPopoverOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  // EPI Form state
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [matriculaAutorizador, setMatriculaAutorizador] = useState("");
  const [motivoTroca, setMotivoTroca] = useState("");
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [funcionarioFuncao, setFuncionarioFuncao] = useState("");
  const [funcionarioMatricula, setFuncionarioMatricula] = useState("");
  const [selectedEpis, setSelectedEpis] = useState<Array<{ id: string; value?: string; qty?: number; extraInput?: string }>>([]);
  const [blusaTamanho, setBlusaTamanho] = useState("");
  const [blusaQtd, setBlusaQtd] = useState(0);
  const [calcaTamanho, setCalcaTamanho] = useState("");
  const [calcaQtd, setCalcaQtd] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Material Form state
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRequisition | null>(null);
  const [viewMaterial, setViewMaterial] = useState<MaterialRequisition | null>(null);
  const [showMaterialSignature, setShowMaterialSignature] = useState(false);
  const [matData, setMatData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [matAutorizadoPor, setMatAutorizadoPor] = useState("");
  const [matMatriculaAutorizador, setMatMatriculaAutorizador] = useState("");
  const [matMotivo, setMatMotivo] = useState("");
  const [matFuncionarioNome, setMatFuncionarioNome] = useState("");
  const [matFuncionarioFuncao, setMatFuncionarioFuncao] = useState("");
  const [matFuncionarioMatricula, setMatFuncionarioMatricula] = useState("");
  const [matAreaDestino, setMatAreaDestino] = useState("");
  const [matSelectedItems, setMatSelectedItems] = useState<Array<{ id: string; name: string; qty: number }>>([]);
  const [matPhotoUrls, setMatPhotoUrls] = useState<string[]>([]);
  const [matUploadingPhoto, setMatUploadingPhoto] = useState(false);
  const [matFuncPopoverOpen, setMatFuncPopoverOpen] = useState(false);
  const [matAuthPopoverOpen, setMatAuthPopoverOpen] = useState(false);
  const [matFilterText, setMatFilterText] = useState("");
  const [matFilterMonth, setMatFilterMonth] = useState("");
  const [matFilterDay, setMatFilterDay] = useState("");
  const [matCurrentPage, setMatCurrentPage] = useState(1);

  const lastPickupMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!funcionarioNome) return map;
    const employeeExchanges = exchanges
      .filter(ex => ex.funcionario_nome === funcionarioNome && ex.id !== editingExchange?.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    for (const ex of employeeExchanges) {
      for (const epi of (ex.epis || [])) {
        const epiId = typeof epi === "string" ? epi : (epi as any).id;
        if (!map[epiId]) {
          map[epiId] = ex.data;
        }
      }
    }
    return map;
  }, [funcionarioNome, exchanges, editingExchange]);

  const toggleEpi = (epiId: string) => {
    setSelectedEpis(prev => {
      const exists = prev.find(e => e.id === epiId);
      if (exists) return prev.filter(e => e.id !== epiId);
      return [...prev, { id: epiId, qty: 1 }];
    });
  };

  const setEpiValue = (epiId: string, value: string) => {
    setSelectedEpis(prev => prev.map(e => e.id === epiId ? { ...e, value } : e));
  };

  const setEpiQty = (epiId: string, rawValue: string) => {
    const parsed = rawValue === "" ? undefined : Number(rawValue);
    setSelectedEpis(prev => prev.map(e => e.id === epiId ? { ...e, qty: parsed } : e));
  };

  const resetForm = () => {
    setData(format(new Date(), "yyyy-MM-dd"));
    setAutorizadoPor("");
    setMatriculaAutorizador("");
    setMotivoTroca("");
    setFuncionarioNome("");
    setFuncionarioFuncao("");
    setFuncionarioMatricula("");
    setSelectedEpis([]);
    setBlusaTamanho("");
    setBlusaQtd(0);
    setCalcaTamanho("");
    setCalcaQtd(0);
    setEditingExchange(null);
    setPhotoUrls([]);
  };

  const resetMaterialForm = () => {
    setMatData(format(new Date(), "yyyy-MM-dd"));
    setMatAutorizadoPor("");
    setMatMatriculaAutorizador("");
    setMatMotivo("");
    setMatFuncionarioNome("");
    setMatFuncionarioFuncao("");
    setMatFuncionarioMatricula("");
    setMatAreaDestino("");
    setMatSelectedItems([]);
    setEditingMaterial(null);
    setMatPhotoUrls([]);
  };

  // Restore inventory for an exchange's EPIs
  const restoreInventoryForExchange = async (exchange: EpiExchange) => {
    const { data: freshInventory, error: fetchErr } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name");
    if (fetchErr) {
      console.error("Erro ao buscar estoque para estorno:", fetchErr);
      return [];
    }
    const currentInventory = freshInventory || [];
    const restoredItems: string[] = [];

    for (const epi of (exchange.epis || [])) {
      const epiId = typeof epi === "string" ? epi : (epi as any).id;
      const epiQty = typeof epi === "object" && (epi as any).qty ? Number((epi as any).qty) || 1 : 1;
      const epiValue = typeof epi === "object" ? (epi as any).value : undefined;
      const isOutrosExtra = epiId.startsWith("outros_");
      const epiItem = isOutrosExtra ? EPI_ITEMS.find(e => e.id === "outros") : EPI_ITEMS.find(e => e.id === epiId);
      if (!epiItem) continue;
      const hasDropdown = epiId === "outros" || isOutrosExtra || !!INVENTORY_DROPDOWN_EPIS[epiId];
      const searchLabel = hasDropdown && epiValue ? epiValue : epiItem.label;
      const match = findInventoryMatch(currentInventory, searchLabel);
      if (match) {
        const newQty = match.quantity + epiQty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id);
        if (updateErr) continue;
        await supabase.from("inventory_movements").insert({
          item_id: match.id,
          movement_type: "entrada",
          quantity: epiQty,
          previous_quantity: match.quantity,
          new_quantity: newQty,
          reason: `Estorno Troca de EPI - ${exchange.funcionario_nome}`,
          moved_by: user!.id,
          moved_by_name: profile?.full_name || "Usuário",
          destination_type: "funcionario",
          destination_name: exchange.funcionario_nome,
        });
        match.quantity = newQty;
        restoredItems.push(`${searchLabel} (${epiQty})`);
      }
    }

    if (exchange.uniforme_blusa_quantidade > 0) {
      const blusaMatch = exchange.uniforme_blusa_tamanho
        ? findInventoryMatch(currentInventory, exchange.uniforme_blusa_tamanho)
        : findInventoryMatch(currentInventory, "Camisa Operacional") || findInventoryMatch(currentInventory, "Camisa");
      if (blusaMatch) {
        const qty = exchange.uniforme_blusa_quantidade;
        const newQty = blusaMatch.quantity + qty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", blusaMatch.id);
        if (!updateErr) {
          await supabase.from("inventory_movements").insert({
            item_id: blusaMatch.id, movement_type: "entrada", quantity: qty,
            previous_quantity: blusaMatch.quantity, new_quantity: newQty,
            reason: `Estorno Requisição - ${exchange.funcionario_nome}`,
            moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
            destination_type: "funcionario", destination_name: exchange.funcionario_nome,
          });
          blusaMatch.quantity = newQty;
          restoredItems.push(`Camisa (${qty})`);
        }
      }
    }
    if (exchange.uniforme_calca_quantidade > 0) {
      const calcaMatch = exchange.uniforme_calca_tamanho
        ? findInventoryMatch(currentInventory, exchange.uniforme_calca_tamanho)
        : findInventoryMatch(currentInventory, "Calça Operacional") || findInventoryMatch(currentInventory, "Calça");
      if (calcaMatch) {
        const qty = exchange.uniforme_calca_quantidade;
        const newQty = calcaMatch.quantity + qty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", calcaMatch.id);
        if (!updateErr) {
          await supabase.from("inventory_movements").insert({
            item_id: calcaMatch.id, movement_type: "entrada", quantity: qty,
            previous_quantity: calcaMatch.quantity, new_quantity: newQty,
            reason: `Estorno Requisição - ${exchange.funcionario_nome}`,
            moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
            destination_type: "funcionario", destination_name: exchange.funcionario_nome,
          });
          calcaMatch.quantity = newQty;
          restoredItems.push(`Calça (${qty})`);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    return restoredItems;
  };

  // Restore inventory for material requisition
  const restoreInventoryForMaterial = async (req: MaterialRequisition) => {
    const { data: freshInventory } = await supabase.from("inventory_items").select("*").order("name");
    const currentInventory = freshInventory || [];
    const restoredItems: string[] = [];
    for (const mat of (req.materiais || [])) {
      const match = findInventoryMatch(currentInventory, mat.name);
      if (match) {
        const newQty = match.quantity + mat.qty;
        const { error } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id);
        if (!error) {
          await supabase.from("inventory_movements").insert({
            item_id: match.id, movement_type: "entrada", quantity: mat.qty,
            previous_quantity: match.quantity, new_quantity: newQty,
            reason: `Estorno Requisição Material - ${req.funcionario_nome}`,
            moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
            destination_type: "area", destination_name: req.area_destino,
          });
          match.quantity = newQty;
          restoredItems.push(`${mat.name} (${mat.qty})`);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    return restoredItems;
  };

  const deleteWhatsAppMessages = async (kind: "epi_exchange" | "material_requisition", id: string) => {
    try {
      await supabase.functions.invoke("wapi-delete-message", {
        body: { external_kind: kind, external_id: id },
      });
    } catch (e) {
      console.warn("[deleteWhatsAppMessages] falha", e);
    }
  };

  const handleDeleteWithRestore = async (exchange: EpiExchange) => {
    if (exchange.created_by !== user?.id) {
      toast.error("Apenas o criador pode excluir este registro.");
      return;
    }
    const restoredItems = await restoreInventoryForExchange(exchange);
    await deleteWhatsAppMessages("epi_exchange", exchange.id);
    await deleteExchange.mutateAsync(exchange.id);
    if (restoredItems.length > 0) toast.info(`Estoque restaurado: ${restoredItems.join(", ")}`);
  };

  const handleDeleteMaterial = async (req: MaterialRequisition) => {
    if (req.created_by !== user?.id) {
      toast.error("Apenas o criador pode excluir este registro.");
      return;
    }
    const restoredItems = await restoreInventoryForMaterial(req);
    await deleteWhatsAppMessages("material_requisition", req.id);
    await deleteRequisition.mutateAsync(req.id);
    if (restoredItems.length > 0) toast.info(`Estoque restaurado: ${restoredItems.join(", ")}`);
  };

  const handleEditExchange = (exchange: EpiExchange) => {
    if (exchange.created_by !== user?.id) {
      toast.error("Apenas o criador pode editar este registro.");
      return;
    }
    setEditingExchange(exchange);
    setData(exchange.data);
    setAutorizadoPor(exchange.autorizado_por);
    setMatriculaAutorizador(exchange.matricula_autorizador || "");
    setMotivoTroca(exchange.motivo_troca);
    setFuncionarioNome(exchange.funcionario_nome);
    setFuncionarioFuncao(exchange.funcionario_funcao || "");
    setFuncionarioMatricula(exchange.funcionario_matricula || "");
    setSelectedEpis(
      (exchange.epis || []).map((e: any) =>
        typeof e === "string" ? { id: e, qty: 1 } : { id: e.id, value: e.value, qty: e.qty ?? 1 }
      )
    );
    setBlusaTamanho(exchange.uniforme_blusa_tamanho || "");
    setBlusaQtd(exchange.uniforme_blusa_quantidade || 0);
    setCalcaTamanho(exchange.uniforme_calca_tamanho || "");
    setCalcaQtd(exchange.uniforme_calca_quantidade || 0);
    setPhotoUrls(exchange.photo_urls || []);
    setShowForm(true);
  };

  const handleEditMaterial = (req: MaterialRequisition) => {
    if (req.created_by !== user?.id) {
      toast.error("Apenas o criador pode editar este registro.");
      return;
    }
    setEditingMaterial(req);
    setMatData(req.data);
    setMatAutorizadoPor(req.autorizado_por);
    setMatMatriculaAutorizador(req.matricula_autorizador || "");
    setMatMotivo(req.motivo);
    setMatFuncionarioNome(req.funcionario_nome);
    setMatFuncionarioFuncao(req.funcionario_funcao || "");
    setMatFuncionarioMatricula(req.funcionario_matricula || "");
    setMatAreaDestino(req.area_destino);
    setMatSelectedItems(req.materiais || []);
    setMatPhotoUrls(req.photo_urls || []);
    setShowMaterialForm(true);
  };

  const handleSubmit = () => {
    if (!autorizadoPor || !motivoTroca || !funcionarioNome) return;
    setShowSignature(true);
  };

  const handleMaterialSubmit = () => {
    if (!matAutorizadoPor || !matMotivo || !matFuncionarioNome || !matAreaDestino || matSelectedItems.length === 0) {
      toast.error("Preencha todos os campos obrigatórios e adicione pelo menos um material.");
      return;
    }
    setShowMaterialSignature(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMaterial = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (isMaterial) setMatUploadingPhoto(true);
    else setUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `epi-danificado/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("desvios").upload(path, await compressImage(file));
        if (uploadErr) { toast.error("Erro ao enviar foto"); continue; }
        const { data: urlData } = supabase.storage.from("desvios").getPublicUrl(path);
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
      }
      if (isMaterial) setMatPhotoUrls(prev => [...prev, ...newUrls]);
      else setPhotoUrls(prev => [...prev, ...newUrls]);
      if (newUrls.length > 0) toast.success(`${newUrls.length} foto(s) enviada(s)`);
    } catch (err) {
      toast.error("Erro ao enviar foto");
    } finally {
      if (isMaterial) setMatUploadingPhoto(false);
      else setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const autoSendRequisitionToGroup = useCallback(async (
    type: "epi" | "material",
    caption: string,
    fileBaseName: string,
    prebuiltFile: File,
    externalId?: string,
  ) => {
    try {
      const path = `wapi-requisicoes/${type}/${Date.now()}-${sanitizeShareFileName(fileBaseName)}.png`;
      const { error: upErr } = await supabase.storage.from("desvios").upload(path, await compressImage(prebuiltFile), { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("desvios").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || "";

      if (!publicUrl) {
        throw new Error("URL pública do PNG não gerada");
      }

      // Enfileira na outbox via edge function dedicada (respeita delay global)
      const { data: invokeData, error: invokeErr } = await supabase.functions.invoke("wapi-requisition-notify", {
        body: { type, caption, image_url: publicUrl, external_id: externalId },
      });
      if (invokeErr) {
        toast.error("Falha ao enfileirar requisição para o grupo", { description: invokeErr.message });
      } else if ((invokeData as any)?.skipped) {
        // silencioso: integração desabilitada
      }
    } catch (err) {
      console.error("[autoSendRequisitionToGroup]", err);
      toast.error("Falha no envio automático ao grupo", { description: String((err as Error)?.message || err) });
    }
  }, []);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const handleResendExchange = useCallback(async (exchange: EpiExchange) => {
    if (resendingId) return;
    setResendingId(exchange.id);
    const toastId = toast.loading("Reenviando EPI ao grupo...");
    try {
      // Invalida cache para regenerar a imagem com o layout atual
      const shareKey = getExchangeShareKey(exchange);
      sharePayloadCacheRef.current.delete(shareKey);
      sharePayloadPromiseRef.current.delete(shareKey);
      const payload = await buildExchangeSharePayload(exchange);
      await autoSendRequisitionToGroup("epi", payload.description, exchange.funcionario_nome, payload.file, exchange.id);
      toast.dismiss(toastId);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Falha ao reenviar EPI", { description: String((e as Error)?.message || e) });
    } finally {
      setResendingId(null);
    }
  }, [resendingId, buildExchangeSharePayload, autoSendRequisitionToGroup]);

  const handleSignatureConfirm = async (sigFuncionario: string, sigAutorizador: string) => {
    const currentSelectedEpis = [...selectedEpis];
    const currentFuncionarioNome = funcionarioNome;
    const currentBlusaQtd = blusaQtd;
    const currentCalcaQtd = calcaQtd;
    const currentBlusaTamanho = blusaTamanho;
    const currentCalcaTamanho = calcaTamanho;
    const currentEditingExchange = editingExchange;

    const exchangeData = {
      data,
      autorizado_por: autorizadoPor,
      matricula_autorizador: matriculaAutorizador || null,
      motivo_troca: motivoTroca,
      funcionario_nome: currentFuncionarioNome,
      funcionario_funcao: funcionarioFuncao || null,
      funcionario_matricula: funcionarioMatricula || null,
      epis: currentSelectedEpis as any,
      uniforme_blusa_tamanho: currentBlusaTamanho || null,
      uniforme_blusa_quantidade: currentBlusaQtd,
      uniforme_calca_tamanho: currentCalcaTamanho || null,
      uniforme_calca_quantidade: currentCalcaQtd,
      assinatura_funcionario: sigFuncionario || null,
      assinatura_autorizador: sigAutorizador || null,
      photo_urls: photoUrls,
    };

    let savedExchange: EpiExchange;
    try {
      if (currentEditingExchange) {
        await restoreInventoryForExchange(currentEditingExchange);
        savedExchange = await updateExchange.mutateAsync({ id: currentEditingExchange.id, ...exchangeData });
      } else {
        savedExchange = await createExchange.mutateAsync(exchangeData);
      }
    } catch (err) {
      console.error("Erro ao salvar troca de EPI:", err);
      setShowSignature(false);
      return;
    }

    // Fecha o formulário imediatamente — baixa estoque e envia ao WhatsApp em background
    setShowSignature(false);
    resetForm();
    setShowForm(false);

    // Deduct inventory em paralelo (não bloqueia UI)
    (async () => {
      try {
        const { data: freshInventory } = await supabase.from("inventory_items").select("*").order("name");
        const currentInventory = freshInventory || [];
        const deductedItems: string[] = [];
        const notFoundItems: string[] = [];
        const updateOps: Promise<any>[] = [];

        for (const epi of currentSelectedEpis) {
          const isOutrosExtra = epi.id.startsWith("outros_");
          const epiItem = isOutrosExtra ? EPI_ITEMS.find(e => e.id === "outros") : EPI_ITEMS.find(e => e.id === epi.id);
          if (!epiItem) continue;
          const epiQty = Number(epi.qty) || 1;
          const hasDropdown = epi.id === "outros" || isOutrosExtra || !!INVENTORY_DROPDOWN_EPIS[epi.id];
          const searchLabel = hasDropdown && epi.value ? epi.value : epiItem.label;
          const match = findInventoryMatch(currentInventory, searchLabel);
          if (match && match.quantity >= epiQty) {
            const newQty = match.quantity - epiQty;
            updateOps.push(supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id));
            updateOps.push(supabase.from("inventory_movements").insert({
              item_id: match.id, movement_type: "saida", quantity: epiQty,
              previous_quantity: match.quantity, new_quantity: newQty,
              reason: `Troca de EPI - ${currentFuncionarioNome}`,
              moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
              destination_type: "funcionario", destination_name: currentFuncionarioNome,
            }));
            match.quantity = newQty;
            deductedItems.push(`${searchLabel} (${epiQty})`);
          } else if (!match) {
            notFoundItems.push(searchLabel);
          }
        }

        if (currentBlusaQtd > 0) {
          const blusaMatch = blusaTamanho
            ? findInventoryMatch(currentInventory, blusaTamanho)
            : findInventoryMatch(currentInventory, "Camisa Operacional") || findInventoryMatch(currentInventory, "Camisa");
          if (blusaMatch && blusaMatch.quantity >= currentBlusaQtd) {
            const newQty = blusaMatch.quantity - currentBlusaQtd;
            updateOps.push(supabase.from("inventory_items").update({ quantity: newQty }).eq("id", blusaMatch.id));
            updateOps.push(supabase.from("inventory_movements").insert({
              item_id: blusaMatch.id, movement_type: "saida", quantity: currentBlusaQtd,
              previous_quantity: blusaMatch.quantity, new_quantity: newQty,
              reason: `Requisição - ${currentFuncionarioNome}`,
              moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
              destination_type: "funcionario", destination_name: currentFuncionarioNome,
            }));
            deductedItems.push(`Camisa Operacional (${currentBlusaQtd})`);
          }
        }
        if (currentCalcaQtd > 0) {
          const calcaMatch = calcaTamanho
            ? findInventoryMatch(currentInventory, calcaTamanho)
            : findInventoryMatch(currentInventory, "Calça Operacional") || findInventoryMatch(currentInventory, "Calça");
          if (calcaMatch && calcaMatch.quantity >= currentCalcaQtd) {
            const newQty = calcaMatch.quantity - currentCalcaQtd;
            updateOps.push(supabase.from("inventory_items").update({ quantity: newQty }).eq("id", calcaMatch.id));
            updateOps.push(supabase.from("inventory_movements").insert({
              item_id: calcaMatch.id, movement_type: "saida", quantity: currentCalcaQtd,
              previous_quantity: calcaMatch.quantity, new_quantity: newQty,
              reason: `Requisição - ${currentFuncionarioNome}`,
              moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
              destination_type: "funcionario", destination_name: currentFuncionarioNome,
            }));
            deductedItems.push(`Calça Operacional (${currentCalcaQtd})`);
          }
        }

        await Promise.all(updateOps);
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
        // Removida notificação de estoque por solicitação do usuário

        if (notFoundItems.length > 0) toast.warning(`Itens não encontrados no estoque: ${notFoundItems.join(", ")}`);
      } catch (err) {
        toast.error("Erro ao atualizar estoque.");
      }
    })();

    // Envio automático para grupo do WhatsApp em background (não bloqueia UI)
    (async () => {
      try {
        const payload = await buildExchangeSharePayload(savedExchange);
        let caption = payload.description;
        if (currentEditingExchange) {
          caption = `✏️ *REQUISIÇÃO DE EPI ALTERADA*\n\n--- INFORMAÇÕES ANTIGAS ---\n${buildExchangeShareDescription(currentEditingExchange)}\n\n--- NOVAS INFORMAÇÕES ---\n${caption}`;
        }
        await autoSendRequisitionToGroup("epi", caption, currentFuncionarioNome, payload.file, savedExchange.id);
      } catch (e) {
        console.error("[TrocaEpi] auto send EPI prep failed", e);
      }
    })();
  };

  const handleMaterialSignatureConfirm = async (sigFuncionario: string, sigAutorizador: string) => {
    const currentItems = [...matSelectedItems];
    const currentFuncNome = matFuncionarioNome;
    const currentEditing = editingMaterial;

    const reqData = {
      data: matData,
      autorizado_por: matAutorizadoPor,
      matricula_autorizador: matMatriculaAutorizador || null,
      motivo: matMotivo,
      funcionario_nome: currentFuncNome,
      funcionario_funcao: matFuncionarioFuncao || null,
      funcionario_matricula: matFuncionarioMatricula || null,
      materiais: currentItems as any,
      area_destino: matAreaDestino,
      photo_urls: matPhotoUrls,
      assinatura_funcionario: sigFuncionario || null,
      assinatura_autorizador: sigAutorizador || null,
    };

    let savedRequisition: MaterialRequisition;

    try {
      if (currentEditing) {
        await restoreInventoryForMaterial(currentEditing);
        savedRequisition = await updateRequisition.mutateAsync({ id: currentEditing.id, ...reqData });
      } else {
        savedRequisition = await createRequisition.mutateAsync(reqData);
      }
    } catch (err) {
      setShowMaterialSignature(false);
      return;
    }

    // Fecha o formulário imediatamente — baixa estoque e envia ao WhatsApp em background
    setShowMaterialSignature(false);

    // Deduct inventory for materials em paralelo (background)
    (async () => {
      try {
        const { data: freshInventory } = await supabase.from("inventory_items").select("*").order("name");
        const currentInventory = freshInventory || [];
        const deductedItems: string[] = [];
        const updateOps: Promise<any>[] = [];

        for (const mat of currentItems) {
          const match = findInventoryMatch(currentInventory, mat.name);
          if (match && match.quantity >= mat.qty) {
            const newQty = match.quantity - mat.qty;
            updateOps.push(supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id));
            updateOps.push(supabase.from("inventory_movements").insert({
              item_id: match.id, movement_type: "saida", quantity: mat.qty,
              previous_quantity: match.quantity, new_quantity: newQty,
              reason: `Requisição Material - ${currentFuncNome} (${matAreaDestino})`,
              moved_by: user!.id, moved_by_name: profile?.full_name || "Usuário",
              destination_type: "area", destination_name: matAreaDestino,
            }));
            match.quantity = newQty;
            deductedItems.push(`${mat.name} (${mat.qty})`);
          }
        }

        await Promise.all(updateOps);
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
        // Removida notificação de estoque por solicitação do usuário
      } catch (err) {
        toast.error("Erro ao atualizar estoque.");
      }
    })();

    // Envio automático para grupo do WhatsApp em background (não bloqueia UI)
    (async () => {
      try {
        const payload = await buildMaterialSharePayload(savedRequisition);
        let caption = payload.description;

        if (currentEditing) {
          caption = `✏️ *REQUISIÇÃO DE MATERIAL ALTERADA*\n\n--- INFORMAÇÕES ANTIGAS ---\n${buildMaterialShareDescription(currentEditing)}\n\n--- NOVAS INFORMAÇÕES ---\n${caption}`;
        }

        await autoSendRequisitionToGroup("material", caption, currentFuncNome, payload.file, savedRequisition.id);
      } catch (e) { console.warn("auto send Material prep failed", e); }
    })();

    resetMaterialForm();
    setShowMaterialForm(false);
  };

  const handlePrint = async (exchange: EpiExchange) => {
    const logoBase64 = await loadCachedLogoBase64();
    await generatePdf(exchange, logoBase64);
  };

  const handlePrintMaterial = async (req: MaterialRequisition) => {
    const logoBase64 = await loadCachedLogoBase64();
    await generateMaterialPdf(req, logoBase64);
  };

  const handlePngWhatsApp = async (exchange: EpiExchange) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const phone = "559193645741";
    const shareKey = getExchangeShareKey(exchange);
    const hadCachedPayload = sharePayloadCacheRef.current.has(shareKey);

    try {
      toast.info(hadCachedPayload ? "Abrindo compartilhamento..." : "Gerando imagem...");
      const payload = hadCachedPayload
        ? sharePayloadCacheRef.current.get(shareKey)!
        : await getExchangeSharePayload(exchange);

      if (isMobile) {
        const shareVariants: ShareData[] = typeof navigator.share === "function"
          ? [
              { files: [payload.file], title: payload.title, text: payload.description },
              { files: [payload.file], title: payload.title },
              { files: [payload.file] },
            ].filter((shareData) => {
              if (typeof navigator.canShare !== "function") {
                return true;
              }

              try {
                return navigator.canShare(shareData);
              } catch {
                return false;
              }
            })
          : [];

        for (const shareData of shareVariants) {
          try {
            await navigator.share(shareData);
            toast.success("Compartilhado com sucesso!");
            return;
          } catch (error: any) {
            if (error?.name === "AbortError") {
              return;
            }
          }
        }

        if (!hadCachedPayload && shareVariants.length > 0) {
          toast.info("Imagem pronta. Toque novamente para compartilhar direto no celular.");
          return;
        }

        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(payload.description)}`;
        toast.error("Seu celular bloqueou o anexo direto. Abri o WhatsApp com a descrição.");
        return;
      }

      const blobUrl = URL.createObjectURL(payload.file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = payload.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((resolve) => setTimeout(resolve, 500));
      URL.revokeObjectURL(blobUrl);
      toast.success("Imagem baixada! Anexe-a na conversa.");
      window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(payload.description)}`, "_blank");
    } catch (err) {
      toast.error("Erro ao gerar PNG");
    }
  };

  // Render photo upload section
  const renderPhotoUpload = (urls: string[], setUrls: React.Dispatch<React.SetStateAction<string[]>>, uploading: boolean, isMaterial: boolean) => (
    <div>
      <Label className="mb-2 block">Fotos</Label>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, isMaterial)} disabled={uploading} />
          <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-primary/50 rounded-lg hover:bg-accent/50 transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-4 w-4 text-primary" />}
            <span className="text-sm text-primary font-medium">{uploading ? "Enviando..." : "Adicionar Foto"}</span>
          </div>
        </label>
        {urls.map((url, idx) => (
          <div key={idx} className="relative group">
            <img loading="lazy" decoding="async" src={url} alt={`Foto ${idx + 1}`} className="h-16 w-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedPhoto(url)} />
            <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setUrls(prev => prev.filter((_, i) => i !== idx))}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Render authorizer picker
  const renderAuthPicker = (value: string, setValue: (v: string) => void, setMatricula: (v: string) => void, open: boolean, setOpen: (v: boolean) => void) => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal h-10">
          {value || <span className="text-muted-foreground">Selecione o autorizador</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Buscar funcionário..." />
          <CommandList>
            <CommandEmpty>Nenhum encontrado</CommandEmpty>
            {efetivo.map(col => (
              <CommandItem key={col.id} value={`${col.nome} ${col.matricula} ${col.funcao}`} onSelect={() => { setValue(col.nome); setMatricula(col.matriculaHydro || col.matricula || ""); setOpen(false); }}>
                <span>{col.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{col.matricula}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  // Render employee picker
  const renderFuncPicker = (value: string, setValue: (v: string) => void, setFuncao: (v: string) => void, setMatricula: (v: string) => void, open: boolean, setOpen: (v: boolean) => void) => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal h-10">
          {value || <span className="text-muted-foreground">Selecione o funcionário</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Buscar funcionário..." />
          <CommandList>
            <CommandEmpty>Nenhum encontrado</CommandEmpty>
            {efetivo.map(col => (
              <CommandItem key={col.id} value={`${col.nome} ${col.funcao} ${col.matricula}`} onSelect={() => { setValue(col.nome); setFuncao(col.funcao || ""); setMatricula(col.matriculaHydro || col.matricula || ""); setOpen(false); }}>
                <span>{col.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{col.funcao} - {col.matricula}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  // Filter helper
  const renderFilters = (text: string, setText: (v: string) => void, month: string, setMonth: (v: string) => void, day: string, setDay: (v: string) => void, setPage: (v: number) => void) => (
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou autorizador..." value={text} onChange={e => { setText(e.target.value); setPage(1); }} className="pl-9" />
      </div>
      <Select value={month} onValueChange={v => { setMonth(v); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {Array.from({ length: 12 }, (_, i) => {
            const m = String(i + 1).padStart(2, "0");
            const label = new Date(2026, i).toLocaleString("pt-BR", { month: "long" });
            return <SelectItem key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
          })}
        </SelectContent>
      </Select>
      <Input type="date" value={day} onChange={e => { setDay(e.target.value); setPage(1); }} className="w-full sm:w-44" />
      {day && <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setDay(""); setPage(1); }}><X className="h-4 w-4" /></Button>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/almoxarifado")}
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <EditablePageTitle pageKey="troca-epi" defaultValue="Requisição" className="text-2xl font-bold text-foreground" />
          <p className="text-sm text-muted-foreground">Requisição de EPI e materiais</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="epi" className="gap-2"><ShieldCheck className="h-4 w-4" /> Troca de EPI</TabsTrigger>
          <TabsTrigger value="material" className="gap-2"><Package className="h-4 w-4" /> Material</TabsTrigger>
        </TabsList>

        {/* ===== EPI TAB ===== */}
        <TabsContent value="epi" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Troca
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {renderFilters(filterText, setFilterText, filterMonth, setFilterMonth, filterDay, setFilterDay, setCurrentPage)}
              {(() => {
                const filtered = exchanges
                  .filter(ex => {
                    const text = filterText.toLowerCase();
                    const matchesText = !text || ex.funcionario_nome.toLowerCase().includes(text) || ex.autorizado_por.toLowerCase().includes(text);
                    const matchesMonth = !filterMonth || filterMonth === "all" || ex.data.substring(5, 7) === filterMonth;
                    const matchesDay = !filterDay || ex.data === filterDay;
                    return matchesText && matchesMonth && matchesDay;
                  })
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
                const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
                const page = Math.min(currentPage, totalPages);
                const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
                if (filtered.length === 0) return (
                  <Card><CardContent className="py-10 text-center text-muted-foreground"><ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma troca de EPI registrada.</p></CardContent></Card>
                );
                return (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">{filtered.length} registro(s)</p>
                    <div className="grid gap-3 max-h-[65vh] overflow-y-auto pr-1">
                      {paged.map(ex => (
                        <Card key={ex.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base">{ex.funcionario_nome}</span>
                                <Badge variant="outline" className="text-xs">{format(new Date(ex.data + 'T12:00:00'), "dd/MM/yyyy")}</Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">Autorizado por: {ex.autorizado_por} | {ex.motivo_troca.substring(0, 40)}{ex.motivo_troca.length > 40 ? '...' : ''}</p>
                              <div className="flex gap-1 flex-wrap">
                                {(ex.epis || []).slice(0, 3).map((e: any) => {
                                  const item = EPI_ITEMS.find(i => i.id === (typeof e === 'string' ? e : e.id));
                                  return <Badge key={typeof e === 'string' ? e : e.id} variant="secondary" className="text-[10px]">{item?.label || 'EPI'}</Badge>;
                                })}
                                {(ex.epis || []).length > 3 && <Badge variant="secondary" className="text-[10px]">+{(ex.epis || []).length - 3}</Badge>}
                                {ex.photo_urls && ex.photo_urls.length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Camera className="h-3 w-3" /> {ex.photo_urls.length}</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewExchange(ex)}><Eye className="h-4 w-4" /></Button>
                              {ex.created_by === user?.id && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditExchange(ex)}><Pencil className="h-4 w-4" /></Button>}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(ex)}><FileText className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onTouchStart={() => primeExchangeSharePayload(ex)} onClick={() => handlePngWhatsApp(ex)}><MessageCircle className="h-4 w-4 text-[#25D366]" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Reenviar EPI ao grupo" disabled={resendingId === ex.id} onClick={() => handleResendExchange(ex)}>
                                {resendingId === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
                              </Button>
                              {ex.created_by === user?.id && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteWithRestore(ex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                        <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>

        {/* ===== MATERIAL TAB ===== */}
        <TabsContent value="material" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetMaterialForm(); setShowMaterialForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Requisição
            </Button>
          </div>

          {isLoadingMaterial ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {renderFilters(matFilterText, setMatFilterText, matFilterMonth, setMatFilterMonth, matFilterDay, setMatFilterDay, setMatCurrentPage)}
              {(() => {
                const filtered = requisitions
                  .filter(r => {
                    const text = matFilterText.toLowerCase();
                    const matchesText = !text || r.funcionario_nome.toLowerCase().includes(text) || r.autorizado_por.toLowerCase().includes(text);
                    const matchesMonth = !matFilterMonth || matFilterMonth === "all" || r.data.substring(5, 7) === matFilterMonth;
                    const matchesDay = !matFilterDay || r.data === matFilterDay;
                    return matchesText && matchesMonth && matchesDay;
                  })
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
                const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
                const page = Math.min(matCurrentPage, totalPages);
                const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
                if (filtered.length === 0) return (
                  <Card><CardContent className="py-10 text-center text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma requisição de material registrada.</p></CardContent></Card>
                );
                return (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">{filtered.length} registro(s)</p>
                    <div className="grid gap-3 max-h-[65vh] overflow-y-auto pr-1">
                      {paged.map(r => (
                        <Card key={r.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base">{r.funcionario_nome}</span>
                                <Badge variant="outline" className="text-xs">{format(new Date(r.data + 'T12:00:00'), "dd/MM/yyyy")}</Badge>
                                <Badge className="text-xs">{r.area_destino}</Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">Autorizado por: {r.autorizado_por} | {r.motivo.substring(0, 40)}{r.motivo.length > 40 ? '...' : ''}</p>
                              <div className="flex gap-1 flex-wrap">
                                {(r.materiais || []).slice(0, 3).map((m, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">{m.name} (x{m.qty})</Badge>
                                ))}
                                {(r.materiais || []).length > 3 && <Badge variant="secondary" className="text-[10px]">+{(r.materiais || []).length - 3}</Badge>}
                                {r.photo_urls && r.photo_urls.length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Camera className="h-3 w-3" /> {r.photo_urls.length}</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMaterial(r)}><Eye className="h-4 w-4" /></Button>
                              {r.created_by === user?.id && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditMaterial(r)}><Pencil className="h-4 w-4" /></Button>}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintMaterial(r)}><FileText className="h-4 w-4" /></Button>
                              {r.created_by === user?.id && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteMaterial(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setMatCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                        <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setMatCurrentPage(p => p + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== EPI FORM DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingExchange ? "Editar Troca de EPI" : "Nova Autorização de Troca de EPI"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Data *</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
              <div><Label>Contrato</Label><Input value="4600012690" disabled /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Autorizado por *</Label>
                {renderAuthPicker(autorizadoPor, setAutorizadoPor, setMatriculaAutorizador, authPopoverOpen, setAuthPopoverOpen)}
              </div>
              <div><Label>Matrícula (Autorizador)</Label><Input value={matriculaAutorizador} onChange={e => setMatriculaAutorizador(e.target.value)} /></div>
            </div>

            {renderPhotoUpload(photoUrls, setPhotoUrls, uploadingPhoto, false)}

            <div><Label>Motivo da Troca *</Label><Textarea value={motivoTroca} onChange={e => setMotivoTroca(e.target.value)} placeholder="Descreva o motivo da troca" /></div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Funcionário(a) *</Label>
                {renderFuncPicker(funcionarioNome, setFuncionarioNome, setFuncionarioFuncao, setFuncionarioMatricula, funcPopoverOpen, setFuncPopoverOpen)}
              </div>
              <div><Label>Função</Label><Input value={funcionarioFuncao} onChange={e => setFuncionarioFuncao(e.target.value)} /></div>
              <div><Label>Matrícula Hydro</Label><Input value={funcionarioMatricula} onChange={e => setFuncionarioMatricula(e.target.value)} /></div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">EPI</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {EPI_ITEMS.map(item => {
                  const selected = selectedEpis.find(e => e.id === item.id);
                  const lastDate = lastPickupMap[item.id];
                  const hasDropdown = item.id === "outros" || !!INVENTORY_DROPDOWN_EPIS[item.id];
                  const searchLabel = hasDropdown && selected?.value ? selected.value : item.label;
                  const invMatch = selected ? findInventoryMatch(inventoryItems, searchLabel) : null;
                  return (
                    <div key={item.id} className="flex flex-col gap-0.5 p-1.5 rounded-md hover:bg-accent/50">
                      <div className="flex items-center gap-2 min-h-[36px] flex-wrap">
                        <Checkbox checked={!!selected} onCheckedChange={() => toggleEpi(item.id)} className="h-5 w-5" />
                        <span className="text-sm flex-1">{item.label}</span>
                        {selected && (
                          <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Qtd:</Label>
                            <Input type="number" min={1} className="h-7 w-14 text-xs text-center" value={selected.qty ?? ""} onChange={e => setEpiQty(item.id, e.target.value)} />
                          </div>
                        )}
                        {item.hasInput && selected && item.id !== "outros" && !INVENTORY_DROPDOWN_EPIS[item.id] && (
                          <Input className="h-8 w-24 text-xs" placeholder={item.inputLabel} value={selected.value || ""} onChange={e => setEpiValue(item.id, e.target.value)} />
                        )}
                        {item.hasInput && selected && INVENTORY_DROPDOWN_EPIS[item.id] && (
                          <Input className="h-8 w-20 text-xs" placeholder="Nº" value={selected.extraInput || ""} onChange={e => {
                            const updated = selectedEpis.map(ep => ep.id === item.id ? { ...ep, extraInput: e.target.value } : ep);
                            setSelectedEpis(updated);
                          }} />
                        )}
                      </div>
                      {selected && INVENTORY_DROPDOWN_EPIS[item.id] && (() => {
                        const cfg = INVENTORY_DROPDOWN_EPIS[item.id];
                        const matches = inventoryItems.filter(inv => inv.quantity > 0 && normalizeText(inv.name).includes(cfg.keyword));
                        return (
                          <div className="ml-6 mt-1">
                            <Select value={selected.value || ""} onValueChange={v => setEpiValue(item.id, v)}>
                              <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder={cfg.placeholder} /></SelectTrigger>
                              <SelectContent>{matches.map(inv => <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        );
                      })()}
                      {item.id === "outros" && selected && (
                        <div className="ml-6 mt-1 space-y-2">
                          <Select value={selected.value || ""} onValueChange={v => setEpiValue(item.id, v)}>
                            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Selecione do estoque..." /></SelectTrigger>
                            <SelectContent>{inventoryItems.filter(inv => inv.quantity > 0).map(inv => <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>)}</SelectContent>
                          </Select>
                          {selectedEpis.filter(e => e.id.startsWith("outros_")).map(extra => {
                            const extraInvMatch = extra.value ? findInventoryMatch(inventoryItems, extra.value) : null;
                            return (
                              <div key={extra.id} className="flex items-center gap-2">
                                <Select value={extra.value || ""} onValueChange={v => setEpiValue(extra.id, v)}>
                                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecione do estoque..." /></SelectTrigger>
                                  <SelectContent>{inventoryItems.filter(inv => inv.quantity > 0).map(inv => <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="flex items-center gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Qtd:</Label>
                                  <Input type="number" min={1} className="h-7 w-14 text-xs text-center" value={extra.qty ?? ""} onChange={e => setEpiQty(extra.id, e.target.value)} />
                                </div>
                                {extraInvMatch && <span className={`text-[10px] ${extraInvMatch.quantity <= extraInvMatch.min_quantity ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>Est: {extraInvMatch.quantity}</span>}
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedEpis(prev => prev.filter(e => e.id !== extra.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            );
                          })}
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            const existingExtras = selectedEpis.filter(e => e.id.startsWith("outros_"));
                            setSelectedEpis(prev => [...prev, { id: `outros_${existingExtras.length + 1}`, qty: 1 }]);
                          }}><Plus className="h-3 w-3 mr-1" /> Adicionar outro item</Button>
                        </div>
                      )}
                      {selected && invMatch && <span className={`text-[10px] ml-6 ${invMatch.quantity <= invMatch.min_quantity ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>Estoque: {invMatch.quantity} {invMatch.unit}</span>}
                      {selected && lastDate && <span className="text-[10px] text-warning ml-6">Última retirada: {format(new Date(lastDate + "T12:00:00"), "dd/MM/yyyy")}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">Uniforme</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Camisa Operacional:</span>
                  <Select value={blusaTamanho} onValueChange={setBlusaTamanho}>
                    <SelectTrigger className="w-48 h-8"><SelectValue placeholder="Selecione a camisa..." /></SelectTrigger>
                    <SelectContent>
                      {camisaOptions.map(inv => (
                        <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>
                      ))}
                      {camisaOptions.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma camisa no estoque</div>}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Qtd:</Label>
                    <Input type="number" min={0} className="h-8 w-16" value={blusaQtd} onChange={e => setBlusaQtd(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Calça Operacional:</span>
                  <Select value={calcaTamanho} onValueChange={setCalcaTamanho}>
                    <SelectTrigger className="w-48 h-8"><SelectValue placeholder="Selecione a calça..." /></SelectTrigger>
                    <SelectContent>
                      {calcaOptions.map(inv => (
                        <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>
                      ))}
                      {calcaOptions.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma calça no estoque</div>}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Qtd:</Label>
                    <Input type="number" min={0} className="h-8 w-16" value={calcaQtd} onChange={e => setCalcaQtd(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={(createExchange.isPending || updateExchange.isPending) || !autorizadoPor || !motivoTroca || !funcionarioNome}>
                {editingExchange ? "Atualizar e Reassinar" : "Salvar e Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MATERIAL FORM DIALOG ===== */}
      <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Editar Requisição de Material" : "Nova Requisição de Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Data *</Label><Input type="date" value={matData} onChange={e => setMatData(e.target.value)} /></div>
              <div>
                <Label>Área Destino *</Label>
                <Select value={matAreaDestino} onValueChange={setMatAreaDestino}>
                  <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                  <SelectContent>
                    {AREA_DESTINO_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Autorizado por *</Label>
                {renderAuthPicker(matAutorizadoPor, setMatAutorizadoPor, setMatMatriculaAutorizador, matAuthPopoverOpen, setMatAuthPopoverOpen)}
              </div>
              <div><Label>Matrícula (Autorizador)</Label><Input value={matMatriculaAutorizador} onChange={e => setMatMatriculaAutorizador(e.target.value)} /></div>
            </div>

            {renderPhotoUpload(matPhotoUrls, setMatPhotoUrls, matUploadingPhoto, true)}

            <div><Label>Motivo *</Label><Textarea value={matMotivo} onChange={e => setMatMotivo(e.target.value)} placeholder="Descreva o motivo da requisição" /></div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Funcionário(a) *</Label>
                {renderFuncPicker(matFuncionarioNome, setMatFuncionarioNome, setMatFuncionarioFuncao, setMatFuncionarioMatricula, matFuncPopoverOpen, setMatFuncPopoverOpen)}
              </div>
              <div><Label>Função</Label><Input value={matFuncionarioFuncao} onChange={e => setMatFuncionarioFuncao(e.target.value)} /></div>
              <div><Label>Matrícula Hydro</Label><Input value={matFuncionarioMatricula} onChange={e => setMatFuncionarioMatricula(e.target.value)} /></div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">Materiais</h3>
              <div className="space-y-2">
                {matSelectedItems.map((item, idx) => {
                  const invItem = inventoryItems.find(i => i.name === item.name);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={item.name} onValueChange={v => {
                        setMatSelectedItems(prev => prev.map((it, i) => i === idx ? { ...it, name: v, id: v } : it));
                      }}>
                        <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Selecione do estoque..." /></SelectTrigger>
                        <SelectContent>
                          {materialItems.map(inv => (
                            <SelectItem key={inv.id} value={inv.name}>{inv.name} ({inv.quantity} {inv.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Qtd:</Label>
                        <Input type="number" min={1} className="h-8 w-16 text-xs text-center" value={item.qty} onChange={e => {
                          setMatSelectedItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) || 1 } : it));
                        }} />
                      </div>
                      {invItem && <span className={`text-[10px] ${invItem.quantity <= invItem.min_quantity ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>Est: {invItem.quantity}</span>}
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMatSelectedItems(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={() => setMatSelectedItems(prev => [...prev, { id: "", name: "", qty: 1 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Material
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowMaterialForm(false)}>Cancelar</Button>
              <Button onClick={handleMaterialSubmit} disabled={(createRequisition.isPending || updateRequisition.isPending) || !matAutorizadoPor || !matMotivo || !matFuncionarioNome || !matAreaDestino || matSelectedItems.length === 0}>
                {editingMaterial ? "Atualizar e Reassinar" : "Salvar e Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialogs */}
      <SignatureDialog open={showSignature} onClose={() => setShowSignature(false)} onConfirm={handleSignatureConfirm} />
      <SignatureDialog open={showMaterialSignature} onClose={() => setShowMaterialSignature(false)} onConfirm={handleMaterialSignatureConfirm} />

      {/* EPI View Dialog */}
      <Dialog open={!!viewExchange} onOpenChange={() => setViewExchange(null)}>
        <DialogContent className="max-w-2xl w-[95vw] p-3 sm:p-6">
          <DialogHeader><DialogTitle>Detalhes da Troca de EPI</DialogTitle></DialogHeader>
          {viewExchange && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Data:</strong> {format(new Date(viewExchange.data + 'T12:00:00'), "dd/MM/yyyy")}</p>
                <p><strong>Autorizado por:</strong> {viewExchange.autorizado_por}</p>
                <p><strong>Funcionário:</strong> {viewExchange.funcionario_nome}</p>
                <p><strong>Função:</strong> {viewExchange.funcionario_funcao || '-'}</p>
              </div>
              <p><strong>Motivo:</strong> {viewExchange.motivo_troca}</p>
              <div>
                <strong>EPIs selecionados:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewExchange.epis || []).map((e: any) => {
                    const item = EPI_ITEMS.find(i => i.id === (typeof e === 'string' ? e : e.id));
                    const val = typeof e === 'object' && e.value ? `: ${e.value}` : '';
                    return <Badge key={typeof e === 'string' ? e : e.id} variant="secondary">{item?.label || e}{val}</Badge>;
                  })}
                </div>
              </div>
              {(viewExchange.uniforme_blusa_tamanho || viewExchange.uniforme_calca_tamanho) && (
                <div>
                  <strong>Uniforme:</strong>
                  {viewExchange.uniforme_blusa_tamanho && <p>Camisa: {viewExchange.uniforme_blusa_tamanho} (x{viewExchange.uniforme_blusa_quantidade})</p>}
                  {viewExchange.uniforme_calca_tamanho && <p>Calça: {viewExchange.uniforme_calca_tamanho} (x{viewExchange.uniforme_calca_quantidade})</p>}
                </div>
              )}
              {viewExchange.photo_urls && viewExchange.photo_urls.length > 0 && (
                <div>
                  <strong>Fotos:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewExchange.photo_urls.map((url, idx) => (
                      <img loading="lazy" decoding="async" key={idx} src={url} alt={`Foto ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary transition-all" onClick={() => setZoomedPhoto(url)} />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onTouchStart={() => primeExchangeSharePayload(viewExchange)} onClick={() => handlePngWhatsApp(viewExchange)}><MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" /> PNG WhatsApp</Button>
                <Button onClick={() => handlePrint(viewExchange)}><FileText className="h-4 w-4 mr-2" /> Gerar PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Material View Dialog */}
      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent className="max-w-2xl w-[95vw] p-3 sm:p-6">
          <DialogHeader><DialogTitle>Detalhes da Requisição de Material</DialogTitle></DialogHeader>
          {viewMaterial && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Data:</strong> {format(new Date(viewMaterial.data + 'T12:00:00'), "dd/MM/yyyy")}</p>
                <p><strong>Área Destino:</strong> {viewMaterial.area_destino}</p>
                <p><strong>Autorizado por:</strong> {viewMaterial.autorizado_por}</p>
                <p><strong>Funcionário:</strong> {viewMaterial.funcionario_nome}</p>
                <p><strong>Função:</strong> {viewMaterial.funcionario_funcao || '-'}</p>
              </div>
              <p><strong>Motivo:</strong> {viewMaterial.motivo}</p>
              <div>
                <strong>Materiais:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewMaterial.materiais || []).map((m, i) => (
                    <Badge key={i} variant="secondary">{m.name} (x{m.qty})</Badge>
                  ))}
                </div>
              </div>
              {viewMaterial.photo_urls && viewMaterial.photo_urls.length > 0 && (
                <div>
                  <strong>Fotos:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewMaterial.photo_urls.map((url, idx) => (
                      <img loading="lazy" decoding="async" key={idx} src={url} alt={`Foto ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary transition-all" onClick={() => setZoomedPhoto(url)} />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button onClick={() => handlePrintMaterial(viewMaterial)}><FileText className="h-4 w-4 mr-2" /> Gerar PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoom Photo Dialog */}
      <Dialog open={!!zoomedPhoto} onOpenChange={() => setZoomedPhoto(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-2">
          {zoomedPhoto && <img loading="lazy" decoding="async" src={zoomedPhoto} alt="Foto ampliada" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
