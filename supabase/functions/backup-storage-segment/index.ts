// Processa um pedaço (~40MB) de um bucket do Storage, faz upload do ZIP no Drive
// e dispara a próxima invocação. Quando todos os buckets terminam, gera um
// MANIFESTO MESTRE consolidado com todos os arquivos (DB + Storage) para tornar
// o backup auto-descritivo e restaurável em outro sistema sem quebras.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BlobReader,
  BlobWriter,
  TextReader,
  ZipWriter,
} from "https://deno.land/x/zipjs@v2.7.45/index.js";
import { driveUploadJson, driveUploadStreamResumable, driveUploadZip, getDriveAuth } from "../_shared/drive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// Tamanho seguro por invocação. O limite real é a memória do Edge Runtime:
// ZIP + multipart do Drive + buffers de download precisam caber juntos.
const TARGET_BYTES = 34 * 1024 * 1024;
const MAX_BYTES = 44 * 1024 * 1024;
const LARGE_FILE_BYTES = 10 * 1024 * 1024;
const SOFT_TIME_MS = 85_000;
const DOWNLOAD_CONCURRENCY = 2;
const LIST_PAGE = 200;
// Um bucket por ciclo evita dois ZIPs/multipart simultâneos estourarem memória.
const PARALLEL_BUCKETS = 1;


type BucketState = {
  name: string;
  stack: Array<{ prefix: string; offset: number }>;
  part: number;
};

type FailedFile = { bucket: string; path: string; error: string };

async function chainSelf(jobId: string): Promise<void> {
  // Await the dispatch so the EdgeRuntime keeps us alive until the next
  // invocation is queued. Retry a few times to survive transient failures.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/backup-storage-segment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
        },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (r.ok || r.status === 202) {
        try { await r.body?.cancel(); } catch { /* ignore */ }
        return;
      }
    } catch { /* ignore and retry */ }
    await new Promise((res) => setTimeout(res, 500 * attempt));
  }
  // Last resort: mark a hint in the log so the cron/safety net can resume.
  await admin.from("backup_audit_log").insert({
    backup_id: jobId, action: "chain_failed",
    details: { message: "Could not dispatch next segment after 3 attempts" },
  });
}

async function downloadWithRetry(bucket: string, path: string): Promise<Blob | { error: string }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await admin.storage.from(bucket).download(path);
      if (error) {
        if (attempt === 2) return { error: error.message || String(error) };
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      if (!data) {
        if (attempt === 2) return { error: "empty body" };
        continue;
      }
      return data;
    } catch (e) {
      if (attempt === 2) return { error: (e as Error).message || String(e) };
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return { error: "unknown" };
}

async function buildAndUploadMasterManifest(jobId: string) {
  const { data: job } = await admin.from("backup_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job || !job.drive_folder_id) return;
  const auth = await getDriveAuth(admin);

  const manifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: SUPABASE_URL,
    stamp: job.stamp,
    drive_path: job.drive_path,
    kind: job.kind,
    include_storage: !!job.include_storage,
    totals: {
      bytes: job.size_bytes || 0,
      files: job.file_count || 0,
      tables: job.table_count || 0,
      segments: Array.isArray(job.uploaded_segments) ? job.uploaded_segments.length : 0,
      failed_files: Array.isArray(job.failed_files) ? job.failed_files.length : 0,
    },
    segments: job.uploaded_segments || [],
    failed_files: job.failed_files || [],
    restore_instructions: {
      step_1: "Baixe TODOS os arquivos listados em 'segments' da pasta do Drive.",
      step_2: "Restaure o banco: descompacte Backup_*_db.zip e importe cada Banco_Dados/<tabela>.json para a tabela correspondente no novo Supabase (use upsert pelo campo id).",
      step_3: "Restaure o Storage: para cada Backup_*_storage_<bucket>_partN.zip, descompacte e faça upload preservando o caminho relativo. Segmentos kind=storage-file são arquivos grandes enviados separadamente; envie cada um para o bucket/path informado no manifesto.",
      step_4: "Verifique 'failed_files'. Se vazio, o backup está completo. Caso contrário, esses arquivos NÃO foram copiados e precisam ser recuperados manualmente.",
    },
  };

  try {
    const name = `Backup_${job.stamp}_MANIFEST.json`;
    const up = await driveUploadJson(auth, job.drive_folder_id, name, manifest);
    await admin.from("backup_jobs").update({
      manifest_drive_id: up.id,
      manifest_web_link: up.webViewLink,
    }).eq("id", jobId);
    await admin.from("backup_audit_log").insert({
      backup_id: jobId, action: "manifest",
      details: { drive_id: up.id, totals: manifest.totals },
    });
  } catch (e) {
    await admin.from("backup_audit_log").insert({
      backup_id: jobId, action: "manifest_error",
      details: { message: (e as Error).message },
    });
  }
}

type SegmentResult = {
  bucket: BucketState;
  bucketDone: boolean;
  uploaded:
    | { name: string; id: string; size: number; link: string; kind: string; bucket: string; part: number; files_count: number; path?: string }
    | null;
  segCount: number;
  failures: FailedFile[];
};

function safeDriveName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

function mimeForPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".pdf")) return "application/pdf";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".mp4")) return "video/mp4";
  if (p.endsWith(".mov")) return "video/quicktime";
  if (p.endsWith(".mp3")) return "audio/mpeg";
  if (p.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

async function uploadLargeStorageFile(
  auth: any,
  job: any,
  bucket: string,
  path: string,
  part: number,
  expectedSize: number,
): Promise<NonNullable<SegmentResult["uploaded"]>> {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw new Error(`signed url: ${error?.message || "sem URL"}`);

  const resp = await fetch(data.signedUrl);
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    throw new Error(`download stream ${resp.status}: ${text.slice(0, 300)}`);
  }

  const size = Number(resp.headers.get("content-length") || expectedSize || 0);
  if (!size || !Number.isFinite(size)) throw new Error(`tamanho inválido para ${path}`);

  const segName = `Backup_${job.stamp}_storage_${bucket}_part${part}_FILE_${safeDriveName(path)}`;
  const up = await driveUploadStreamResumable(
    auth,
    job.drive_folder_id,
    segName,
    resp.body,
    size,
    resp.headers.get("content-type") || mimeForPath(path),
  );
  return {
    name: segName,
    id: up.id,
    size: up.size || size,
    link: up.webViewLink,
    kind: "storage-file",
    bucket,
    part,
    files_count: 1,
    path,
  };
}

function isFolderItem(it: any) {
  return it.id === null || it.metadata === null;
}

// Backup ignora músicas, vídeos e fotos enviados ao sistema.
const MEDIA_EXT = new Set([
  "mp3","wav","m4a","aac","ogg","flac","opus",
  "mp4","mov","avi","mkv","webm","3gp","m4v",
  "jpg","jpeg","png","gif","webp","heic","heif","bmp","tiff","svg",
]);
function isMediaPath(path: string) {
  const ext = path.toLowerCase().split(".").pop() || "";
  return MEDIA_EXT.has(ext);
}

function itemSize(it: any) {
  const raw = it?.metadata?.size ?? it?.metadata?.contentLength ?? it?.metadata?.content_length ?? it?.size;
  const n = Number(raw || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function processBucket(
  cur: BucketState,
  job: any,
  auth: any,
  t0: number,
): Promise<SegmentResult> {
  const writer = new BlobWriter("application/zip");
  const zip = new ZipWriter(writer, { level: 0 });
  let segSize = 0;
  let segCount = 0;
  const segFiles: Array<{ path: string; size: number }> = [];
  const failures: FailedFile[] = [];
  let largeUploaded: SegmentResult["uploaded"] = null;

  while (cur.stack.length) {
    if (segSize >= TARGET_BYTES && segCount > 0) break;
    if (Date.now() - t0 > SOFT_TIME_MS && segCount > 0) break;

    const top = cur.stack[cur.stack.length - 1];
    const { data: items, error } = await admin
      .storage.from(cur.name)
      .list(top.prefix, { limit: LIST_PAGE, offset: top.offset });
    if (error) {
      failures.push({ bucket: cur.name, path: top.prefix || "/", error: `list: ${error.message}` });
      cur.stack.pop();
      continue;
    }
    const list = items || [];

    if (!list.length) {
      cur.stack.pop();
      continue;
    }

    let descended = false;
    let pauseForNextCycle = false;
    const pageStart = top.offset;
    while (top.offset - pageStart < list.length) {
      const localIndex = top.offset - pageStart;
      const it = list[localIndex];
      if (!it) break;

      const path = top.prefix ? `${top.prefix}/${it.name}` : it.name;
      if (isFolderItem(it)) {
        top.offset += 1;
        cur.stack.push({ prefix: path, offset: 0 });
        descended = true;
        break;
      }

      // Pula músicas, vídeos e fotos — não entram no backup.
      if (isMediaPath(path)) {
        top.offset += 1;
        continue;
      }

      const firstSize = itemSize(it);
      if (firstSize >= LARGE_FILE_BYTES && segCount > 0) {
        pauseForNextCycle = true;
        break;
      }
      if (firstSize >= LARGE_FILE_BYTES && segCount === 0) {
        top.offset += 1;
        largeUploaded = await uploadLargeStorageFile(auth, job, cur.name, path, cur.part, firstSize);
        cur.part++;
        return { bucket: cur, bucketDone: cur.stack.length === 0, uploaded: largeUploaded, segCount: 1, failures };
      }

      if (segCount > 0 && (segSize >= MAX_BYTES || Date.now() - t0 > SOFT_TIME_MS)) break;

      const batch: Array<{ path: string; estimatedSize: number }> = [];
      let batchBytes = 0;
      while (batch.length < DOWNLOAD_CONCURRENCY) {
        const idx = top.offset - pageStart;
        const next = list[idx];
        if (!next) break;
        if (isFolderItem(next)) break;
        const nextPath = top.prefix ? `${top.prefix}/${next.name}` : next.name;
        if (isMediaPath(nextPath)) { top.offset += 1; continue; }
        const estimatedSize = itemSize(next);
        if (estimatedSize >= LARGE_FILE_BYTES && batch.length === 0) break;
        if (estimatedSize >= LARGE_FILE_BYTES && batch.length > 0) break;
        if (
          segCount > 0 &&
          batch.length > 0 &&
          estimatedSize > 0 &&
          segSize + batchBytes + estimatedSize > MAX_BYTES
        ) break;
        if (
          segCount > 0 &&
          batch.length === 0 &&
          estimatedSize > 0 &&
          segSize + estimatedSize > MAX_BYTES
        ) break;
        batch.push({ path: nextPath, estimatedSize });
        batchBytes += estimatedSize;
        top.offset += 1;
      }

      if (!batch.length) break;
      const results = await Promise.all(
        batch.map(async ({ path }) => ({ path, res: await downloadWithRetry(cur.name, path) })),
      );
      for (const { path, res } of results) {
        if (res instanceof Blob) {
          try {
            await zip.add(path, new BlobReader(res));
            segSize += res.size;
            segCount++;
            segFiles.push({ path, size: res.size });
          } catch (e) {
            failures.push({ bucket: cur.name, path, error: `zip: ${(e as Error).message}` });
          }
        } else {
          failures.push({ bucket: cur.name, path, error: res.error });
        }
      }
    }

    if (descended) continue;
    if (pauseForNextCycle) break;
    if (top.offset - pageStart >= list.length && list.length < LIST_PAGE) cur.stack.pop();
    if (segCount > 0 && (segSize >= TARGET_BYTES || Date.now() - t0 > SOFT_TIME_MS)) break;
  }

  let uploaded: SegmentResult["uploaded"] = null;
  if (segCount > 0) {
    await zip.add(`_manifest_part_${cur.part}.json`, new TextReader(JSON.stringify({
      bucket: cur.name, part: cur.part, files_count: segCount,
      generated_at: new Date().toISOString(), files: segFiles,
    }, null, 2)));
    await zip.close();
    const blob = await writer.getData();
    const segName = `Backup_${job.stamp}_storage_${cur.name}_part${cur.part}.zip`;
    const up = await driveUploadZip(auth, job.drive_folder_id, segName, blob);
    uploaded = {
      name: segName, id: up.id, size: up.size || blob.size, link: up.webViewLink,
      kind: "storage", bucket: cur.name, part: cur.part, files_count: segCount,
    };
    cur.part++;
  } else {
    try { await zip.close(); } catch { /* ignore */ }
  }

  return { bucket: cur, bucketDone: cur.stack.length === 0, uploaded, segCount, failures };
}

async function processOneSegment(jobId: string) {
  const t0 = Date.now();
  const { data: job } = await admin.from("backup_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return;
  if (job.status !== "running") {
    if (!job.manifest_drive_id && job.drive_folder_id) {
      await buildAndUploadMasterManifest(jobId);
    }
    return;
  }

  const pending: BucketState[] = Array.isArray(job.pending_buckets) ? job.pending_buckets : [];
  if (!pending.length) {
    await admin.from("backup_jobs").update({
      status: "success", stage: "done", finished_at: new Date().toISOString(),
      last_progress_at: new Date().toISOString(),
    }).eq("id", jobId);
    await buildAndUploadMasterManifest(jobId);
    return;
  }

  const auth = await getDriveAuth(admin);
  const active = pending.slice(0, PARALLEL_BUCKETS);
  const rest = pending.slice(PARALLEL_BUCKETS);

  // Processa N buckets em paralelo (zip + upload em paralelo)
  const results = await Promise.all(active.map((b) => processBucket(b, job, auth, t0)));

  // Reconstroi pending: buckets ainda não terminados ficam, na ordem original; depois o resto.
  const stillActive = results.filter((r) => !r.bucketDone).map((r) => r.bucket);
  const newPending = [...stillActive, ...rest];

  const segments = Array.isArray(job.uploaded_segments) ? job.uploaded_segments : [];
  const failed = Array.isArray(job.failed_files) ? job.failed_files : [];
  let addedSize = 0;
  let addedFiles = 0;
  let addedFailures = 0;

  for (const r of results) {
    if (r.uploaded) {
      segments.push(r.uploaded);
      addedSize += r.uploaded.size || 0;
    }
    addedFiles += r.segCount;
    if (r.failures.length) {
      failed.push(...r.failures);
      addedFailures += r.failures.length;
    }
  }

  const newSize = (job.size_bytes || 0) + addedSize;
  const newFiles = (job.file_count || 0) + addedFiles;
  const finished = newPending.length === 0;

  await admin.from("backup_jobs").update({
    pending_buckets: newPending,
    uploaded_segments: segments,
    failed_files: failed,
    size_bytes: newSize,
    file_count: newFiles,
    last_progress_at: new Date().toISOString(),
    ...(finished
      ? { status: "success", stage: "done", finished_at: new Date().toISOString() }
      : {}),
  }).eq("id", jobId);

  await admin.from("backup_audit_log").insert({
    backup_id: jobId,
    action: finished ? "create" : "segment",
    user_id: job.created_by,
    details: {
      buckets_processed: active.map((b) => b.name),
      parts_uploaded: results.filter((r) => r.uploaded).length,
      files_in_cycle: addedFiles,
      bytes_in_cycle: addedSize,
      failures_in_cycle: addedFailures,
      pending_buckets: newPending.length,
      done: finished,
    },
  });

  if (finished) {
    await buildAndUploadMasterManifest(jobId);
  } else {
    await chainSelf(jobId);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let jobId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    jobId = body.job_id;
  } catch { /* ignore */ }
  if (!jobId) {
    return new Response(JSON.stringify({ error: "job_id obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const task = (async () => {
    try { await processOneSegment(jobId!); }
    catch (e) {
      await admin.from("backup_jobs").update({
        status: "failed",
        error_message: (e as Error).message || String(e),
        finished_at: new Date().toISOString(),
      }).eq("id", jobId!);
      await admin.from("backup_audit_log").insert({
        backup_id: jobId!, action: "error",
        details: { stage: "storage", message: (e as Error).message },
      });
    }
  })();
  // @ts-ignore
  (globalThis as any).EdgeRuntime?.waitUntil?.(task);
  if (!(globalThis as any).EdgeRuntime) await task;

  return new Response(JSON.stringify({ queued: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
