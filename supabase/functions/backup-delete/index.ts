// Exclui um backup do Drive e marca como excluído no histórico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
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
  const unsigned = `${b64urlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  )}.${b64urlEncode(
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { backup_id, user_id } = await req.json();
    const { data: job, error } = await admin
      .from("backup_jobs")
      .select("*")
      .eq("id", backup_id)
      .single();
    if (error || !job) throw new Error("Backup não encontrado");

    if (job.drive_file_id) {
      try {
        if (LOVABLE_API_KEY && GOOGLE_DRIVE_API_KEY) {
          await fetch(
            `${DRIVE_GATEWAY_BASE}/drive/v3/files/${job.drive_file_id}?supportsAllDrives=true`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
              },
            },
          );
        } else {
          const token = await getToken();
          await fetch(
            `https://www.googleapis.com/drive/v3/files/${job.drive_file_id}?supportsAllDrives=true`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
          );
        }
      } catch {
        /* ignore drive errors */
      }
    }

    await admin.from("backup_jobs").delete().eq("id", backup_id);
    await admin.from("backup_audit_log").insert({
      backup_id: null,
      action: "delete",
      user_id: user_id || null,
      details: { drive_path: job.drive_path, kind: job.kind },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
