// Inicia o fluxo OAuth do Google Drive.
// POST inicia o OAuth. Quando chamado por formulário, redireciona direto pro Google
// para evitar bloqueio CORS/fetch do preview.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;

const sanitizeReturnTo = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "sucena.shop" ||
      host === "painelsucena.lovable.app" ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return null;
    url.pathname = "/admin/backup";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const contentType = req.headers.get("Content-Type") || "";
    const isFormPost = contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");
    const isJsonPost = contentType.includes("application/json");
    let token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    let returnTo: string | null = sanitizeReturnTo(req.headers.get("Origin"));
    if (!token && isFormPost) {
      const form = await req.formData();
      token = String(form.get("access_token") || "");
      returnTo = sanitizeReturnTo(String(form.get("return_to") || "")) || returnTo;
    } else if (isJsonPost) {
      const body = await req.json().catch(() => ({}));
      returnTo = sanitizeReturnTo(typeof body?.return_to === "string" ? body.return_to : null) || returnTo;
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-drive-oauth-callback`;
    const state = btoa(JSON.stringify({ uid: user.id, t: Date.now(), returnTo }));

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: "https://www.googleapis.com/auth/drive.file",
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    if (isFormPost) {
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: url, "Referrer-Policy": "no-referrer" },
      });
    }
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
