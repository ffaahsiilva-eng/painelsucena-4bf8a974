// Helpers compartilhados para Google Drive (gateway Lovable preferencial,
// fallback OAuth user / Service Account) usados pelas funções de backup.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY") || "";
const OAUTH_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
const OAUTH_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
const DRIVE_GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_drive";

export type DriveAuth = { mode: "gateway" } | { mode: "token"; token: string };

function b64urlEncode(buf: ArrayBuffer | string) {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

async function getOAuthAccessToken(admin: any): Promise<string | null> {
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) return null;
  const { data } = await admin.from("google_drive_oauth").select("refresh_token").limit(1).maybeSingle();
  if (!data?.refresh_token) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OAuth refresh falhou: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

async function getServiceAccountToken(): Promise<string> {
  if (!SA_JSON) throw new Error("Sem credencial do Drive (gateway/OAuth/SA)");
  const sa = JSON.parse(SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64urlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64urlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64urlEncode(sig)}`,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Drive auth falhou: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

export async function getDriveAuth(admin: any): Promise<DriveAuth> {
  if (LOVABLE_API_KEY && GOOGLE_DRIVE_API_KEY) return { mode: "gateway" };
  const oauth = await getOAuthAccessToken(admin);
  if (oauth) return { mode: "token", token: oauth };
  return { mode: "token", token: await getServiceAccountToken() };
}

export async function driveJson(auth: DriveAuth, path: string, init: RequestInit = {}): Promise<any> {
  const resp = await driveFetch(auth, path, init);
  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!resp.ok) throw new Error(`Drive ${resp.status}: ${JSON.stringify(data).slice(0, 600)}`);
  return data;
}

export async function driveFetch(auth: DriveAuth, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  let url: string;
  if (auth.mode === "gateway") {
    url = `${DRIVE_GATEWAY_BASE}${path}`;
    headers.set("Authorization", `Bearer ${LOVABLE_API_KEY}`);
    headers.set("X-Connection-Api-Key", GOOGLE_DRIVE_API_KEY);
  } else {
    url = `https://www.googleapis.com${path}`;
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return fetch(url, { ...init, headers });
}

export async function driveFindOrCreateFolder(
  auth: DriveAuth, name: string, parentId: string | null,
): Promise<string> {
  const q = [
    `name='${name.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    parentId ? `'${parentId}' in parents` : "",
  ].filter(Boolean).join(" and ");
  const j = await driveJson(
    auth,
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  if (j.files?.length) return j.files[0].id;
  const meta: Record<string, unknown> = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const cj = await driveJson(auth, "/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  return cj.id;
}

export async function driveUploadZip(
  auth: DriveAuth, parentId: string, fileName: string, blob: Blob,
): Promise<{ id: string; webViewLink: string; size: number }> {
  // Resumable upload avoids creating a second multipart Blob in memory.
  // This is essential inside Edge Functions, where ZIP + multipart overhead can
  // exceed the memory limit and stop long Storage backups.
  return await driveUploadBlobResumable(auth, parentId, fileName, blob, "application/zip");
}

export async function driveUploadJson(
  auth: DriveAuth, parentId: string, fileName: string, json: unknown,
): Promise<{ id: string; webViewLink: string; size: number }> {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const meta = { name: fileName, parents: [parentId] };
  const boundary = "lovable_backup_" + crypto.randomUUID();
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const bodyBlob = new Blob([head, blob, tail], { type: `multipart/related; boundary=${boundary}` });
  const j = await driveJson(
    auth,
    "/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,size,webViewLink",
    { method: "POST", headers: { "Content-Type": bodyBlob.type }, body: bodyBlob },
  );
  return { id: j.id, webViewLink: j.webViewLink || "", size: Number(j.size || 0) };
}

export async function driveUploadBlobResumable(
  auth: DriveAuth, parentId: string, fileName: string, blob: Blob, mimeType = "application/octet-stream",
): Promise<{ id: string; webViewLink: string; size: number }> {
  const initResp = await driveFetch(
    auth,
    "/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,size,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(blob.size),
      },
      body: JSON.stringify({ name: fileName, parents: [parentId] }),
    },
  );
  if (!initResp.ok) {
    const text = await initResp.text().catch(() => "");
    throw new Error(`Drive resumable init ${initResp.status}: ${text.slice(0, 600)}`);
  }
  const location = initResp.headers.get("Location") || initResp.headers.get("location");
  if (!location) throw new Error("Drive resumable init sem Location");

  const uploadResp = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": mimeType, "Content-Length": String(blob.size) },
    body: blob,
  });
  const text = await uploadResp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!uploadResp.ok) throw new Error(`Drive resumable upload ${uploadResp.status}: ${JSON.stringify(data).slice(0, 600)}`);
  return { id: data.id, webViewLink: data.webViewLink || "", size: Number(data.size || blob.size || 0) };
}

export async function driveUploadStreamResumable(
  auth: DriveAuth,
  parentId: string,
  fileName: string,
  stream: ReadableStream<Uint8Array>,
  size: number,
  mimeType = "application/octet-stream",
): Promise<{ id: string; webViewLink: string; size: number }> {
  const initResp = await driveFetch(
    auth,
    "/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,size,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify({ name: fileName, parents: [parentId] }),
    },
  );
  if (!initResp.ok) {
    const text = await initResp.text().catch(() => "");
    throw new Error(`Drive stream init ${initResp.status}: ${text.slice(0, 600)}`);
  }
  const location = initResp.headers.get("Location") || initResp.headers.get("location");
  if (!location) throw new Error("Drive stream init sem Location");

  const uploadResp = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": mimeType, "Content-Length": String(size) },
    body: stream,
    // @ts-ignore - required by fetch implementations for streaming request bodies.
    duplex: "half",
  });
  const text = await uploadResp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!uploadResp.ok) throw new Error(`Drive stream upload ${uploadResp.status}: ${JSON.stringify(data).slice(0, 600)}`);
  return { id: data.id, webViewLink: data.webViewLink || "", size: Number(data.size || size || 0) };
}

export async function drivePurgePreviousBackups(auth: DriveAuth) {
  const q = ["name contains 'Backup_'", "trashed=false", "mimeType!='application/vnd.google-apps.folder'"].join(" and ");
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q,
      fields: "nextPageToken,files(id,name,parents)",
      pageSize: "200",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const j: any = await driveJson(auth, `/drive/v3/files?${params.toString()}`);
    for (const f of j.files || []) {
      if (!f.parents?.length) continue;
      try {
        await driveJson(auth, `/drive/v3/files/${f.id}?supportsAllDrives=true`, { method: "DELETE" });
      } catch { /* ignore */ }
    }
    pageToken = j.nextPageToken;
  } while (pageToken);
}
