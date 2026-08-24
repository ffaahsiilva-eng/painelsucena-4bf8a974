// Backup somente do banco de dados — único ZIP pequeno enviado ao Drive,
// substituindo o anterior. Sem mídias (fotos/vídeos/áudios) e sem storage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BlobWriter,
  TextReader,
  Uint8ArrayReader,
  ZipWriter,
} from "https://deno.land/x/zipjs@v2.7.45/index.js";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import {
  drivePurgePreviousBackups,
  driveFindOrCreateFolder,
  driveUploadZip,
  getDriveAuth,
} from "../_shared/drive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DRIVE_ROOT = Deno.env.get("GOOGLE_DRIVE_BACKUP_FOLDER_ID") || "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const SKIP_TABLES = new Set([
  "wapi_message_logs",
  "chat_notification_logs",
  "wapi_outbox",
  "auth_attempts",
]);

async function listTables(): Promise<string[]> {
  const { data, error } = await admin.rpc("get_tables_info");
  if (error) throw error;
  return (data || []).map((r: { table_name: string }) => r.table_name);
}

async function dumpTable(table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function rowsToCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const cols = Array.from(
    rows.reduce((s: Set<string>, r: any) => {
      Object.keys(r || {}).forEach((k) => s.add(k));
      return s;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc((r as any)[c])).join(","));
  return lines.join("\n");
}

function rowsToSheet(rows: any[]) {
  if (!rows || rows.length === 0) return XLSX.utils.aoa_to_sheet([["(vazio)"]]);
  const flat = rows.map((r) => {
    const o: Record<string, any> = {};
    for (const k of Object.keys(r)) {
      const v = (r as any)[k];
      o[k] = v !== null && typeof v === "object" ? JSON.stringify(v) : v;
    }
    return o;
  });
  return XLSX.utils.json_to_sheet(flat);
}

async function buildSummaryPdf(stamp: string, perTable: Record<string, number>, totalRows: number) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595, 842];
  let page = pdf.addPage(pageSize);
  let y = 800;
  const draw = (t: string, size = 10, f = font, color = rgb(0, 0, 0)) => {
    if (y < 40) {
      page = pdf.addPage(pageSize);
      y = 800;
    }
    page.drawText(t, { x: 40, y, size, font: f, color });
    y -= size + 4;
  };
  draw("Relatório de Backup — Sucena", 18, bold, rgb(0.1, 0.4, 0.3));
  draw(`Gerado em: ${stamp}`, 10);
  draw(`Total de tabelas: ${Object.keys(perTable).length}`, 10);
  draw(`Total de registros: ${totalRows}`, 10);
  y -= 8;
  draw("Detalhamento por tabela", 12, bold);
  const entries = Object.entries(perTable).sort(([a], [b]) => a.localeCompare(b));
  for (const [t, n] of entries) draw(`• ${t}  —  ${n} registros`, 9);
  return new Uint8Array(await pdf.save());
}

async function buildDbZip(stamp: string) {
  const writer = new BlobWriter("application/zip");
  const zip = new ZipWriter(writer, { level: 9 });
  const tables = (await listTables()).filter((t) => !SKIP_TABLES.has(t));
  let totalRows = 0;
  const perTable: Record<string, number> = {};
  const workbook = XLSX.utils.book_new();

  for (const t of tables) {
    try {
      const rows = await dumpTable(t);
      totalRows += rows.length;
      perTable[t] = rows.length;
      // JSON
      await zip.add(`JSON/${t}.json`, new TextReader(JSON.stringify(rows)));
      // CSV
      await zip.add(`CSV/${t}.csv`, new TextReader(rowsToCsv(rows)));
      // XLSX sheet (max 31 chars, no special chars)
      const sheetName = t.replace(/[\\/?*[\]:]/g, "_").slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, rowsToSheet(rows), sheetName);
    } catch (e) {
      await zip.add(`_errors/${t}.txt`, new TextReader(String((e as Error).message)));
    }
  }

  // XLSX consolidado
  try {
    const xlsxBuf: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    await zip.add(`Excel/backup_${stamp}.xlsx`, new Uint8ArrayReader(new Uint8Array(xlsxBuf)));
  } catch (e) {
    await zip.add(`_errors/_xlsx.txt`, new TextReader(String((e as Error).message)));
  }

  // PDF relatório
  try {
    const pdfBytes = await buildSummaryPdf(stamp, perTable, totalRows);
    await zip.add(`PDF/relatorio_${stamp}.pdf`, new Uint8ArrayReader(pdfBytes));
  } catch (e) {
    await zip.add(`_errors/_pdf.txt`, new TextReader(String((e as Error).message)));
  }

  await zip.add("manifest.json", new TextReader(JSON.stringify({
    generated_at: new Date().toISOString(),
    kind: "database",
    stamp,
    tables: tables.length,
    total_rows: totalRows,
    per_table_rows: perTable,
    source: SUPABASE_URL,
    version: 7,
    formats: ["JSON", "CSV", "Excel (XLSX)", "PDF"],
    restore_instructions: "Para restaurar o sistema, use os arquivos em JSON/<tabela>.json (upsert por id). CSV/ e Excel/ são para análise. PDF/ é o relatório resumo.",
  }, null, 2)));
  await zip.close();
  return { blob: await writer.getData(), tableCount: tables.length };
}


async function runDbStage(jobId: string, createdBy: string | null) {
  try {
    const auth = await getDriveAuth(admin);
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mi = String(now.getUTCMinutes()).padStart(2, "0");
    const stamp = `${yyyy}-${mm}-${dd}_${hh}-${mi}`;

    let root = DRIVE_ROOT;
    if (!root) root = await driveFindOrCreateFolder(auth, "Sucena_Backup", null);

    try { await drivePurgePreviousBackups(auth); }
    catch (e) { console.warn("purge falhou:", (e as Error).message); }

    const { blob, tableCount } = await buildDbZip(stamp);
    const name = `Backup_${stamp}_db.zip`;
    const up = await driveUploadZip(auth, root, name, blob);

    const segments = [{
      name, id: up.id, size: up.size || blob.size, link: up.webViewLink, kind: "db",
    }];

    await admin.from("backup_jobs").update({
      stage: "done",
      status: "success",
      drive_root_id: root,
      drive_folder_id: root,
      stamp,
      pending_buckets: [],
      uploaded_segments: segments,
      size_bytes: up.size || blob.size,
      table_count: tableCount,
      drive_file_id: up.id,
      drive_path: "Sucena_Backup/",
      drive_web_view_link: up.webViewLink,
      last_progress_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);

    await admin.from("backup_audit_log").insert({
      backup_id: jobId,
      action: "create",
      user_id: createdBy,
      details: { drivePath: "Sucena_Backup/", size: up.size || blob.size, tables: tableCount },
    });

    await admin
      .from("backup_jobs")
      .update({ status: "superseded" })
      .eq("status", "success")
      .neq("id", jobId);

    await admin
      .from("backup_jobs")
      .update({ status: "success" })
      .eq("id", jobId);
  } catch (e) {
    await admin.from("backup_jobs").update({
      status: "failed",
      error_message: (e as Error).message || String(e),
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
    await admin.from("backup_audit_log").insert({
      backup_id: jobId, action: "error", user_id: createdBy,
      details: { stage: "db", message: (e as Error).message },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let kind: "daily" | "weekly" | "monthly" | "manual" | "pre_update" = "manual";
  let createdBy: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.kind) kind = body.kind;
    if (body.created_by) createdBy = body.created_by;
  } catch { /* ignore */ }

  const { data: job, error } = await admin.from("backup_jobs").insert({
    kind, status: "running", stage: "db", include_storage: false, created_by: createdBy,
    last_progress_at: new Date().toISOString(),
  }).select().single();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // @ts-ignore EdgeRuntime presente no Supabase
  (globalThis as any).EdgeRuntime?.waitUntil?.(runDbStage(job.id, createdBy));
  if (!(globalThis as any).EdgeRuntime) runDbStage(job.id, createdBy);

  return new Response(JSON.stringify({ job_id: job.id, stage: "db", queued: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
