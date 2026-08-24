// Lista arquivos no Google Drive na pasta Sucena_Backup e devolve status/quota.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
const DRIVE_ROOT = Deno.env.get("GOOGLE_DRIVE_BACKUP_FOLDER_ID") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY") || "";
const DRIVE_GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_drive";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function b64urlEncode(buf: ArrayBuffer | string) {
  const bytes =
    typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}
async function getToken(): Promise<string> {
  if (!SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado");
  const sa = JSON.parse(SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(
    JSON.stringify(claim),
  )}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlEncode(sig)}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.access_token;
}

async function getJobs() {
  const { data: jobs } = await admin
    .from("backup_jobs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);
  return jobs || [];
}

async function gatewayJson(path: string) {
  const resp = await fetch(`${DRIVE_GATEWAY_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
    },
  });
  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) throw new Error(`Drive gateway falhou (${resp.status}): ${JSON.stringify(data).slice(0, 600)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const jobs = await getJobs();

    if (LOVABLE_API_KEY && GOOGLE_DRIVE_API_KEY) {
      const about = await gatewayJson("/drive/v3/about?fields=storageQuota,user");
      return new Response(
        JSON.stringify({
          configured: true,
          connector: true,
          service_account_email: null,
          account_email: about?.user?.emailAddress || null,
          drive: about,
          last_backup: jobs?.[0] || null,
          recent_jobs: jobs || [],
          root_folder_id: DRIVE_ROOT || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SA_JSON) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "GOOGLE_SERVICE_ACCOUNT_JSON não configurado",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let sa: any;
    try {
      sa = JSON.parse(SA_JSON);
    } catch (_e) {
      return new Response(
        JSON.stringify({
          configured: false,
          error:
            "GOOGLE_SERVICE_ACCOUNT_JSON inválido: cole o conteúdo completo do JSON da Service Account do Google Cloud (começa com { \"type\": \"service_account\", ... }).",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = await getToken();

    // Quota
    const aboutR = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const about = await aboutR.json();

    return new Response(
      JSON.stringify({
        configured: true,
        connector: false,
        service_account_email: sa.client_email,
        account_email: null,
        drive: about,
        last_backup: jobs?.[0] || null,
        recent_jobs: jobs || [],
        root_folder_id: DRIVE_ROOT || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ configured: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
