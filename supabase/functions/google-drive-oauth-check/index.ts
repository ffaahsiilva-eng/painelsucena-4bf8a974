// Verifica se o redirect_uri da função de callback está autorizado no Google Cloud Console
// antes de iniciar o fluxo OAuth. Faz um GET na URL de autorização do Google e procura
// por sinais de "redirect_uri_mismatch" / "invalid_client" no HTML retornado.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const redirectUri = `${SUPABASE_URL}/functions/v1/google-drive-oauth-callback`;
  const result = {
    ok: false as boolean,
    redirectUri,
    clientIdConfigured: !!CLIENT_ID,
    clientSecretConfigured: !!CLIENT_SECRET,
    error: null as string | null,
    hint: null as string | null,
  };

  if (!CLIENT_ID || !CLIENT_SECRET) {
    result.error = "Credenciais OAuth do Google não configuradas no servidor.";
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SucenaBackupCheck/1.0)",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    const text = await resp.text();
    const lower = text.toLowerCase();

    if (lower.includes("redirect_uri_mismatch") || lower.includes("erro 400: redirect_uri_mismatch")) {
      result.error = "redirect_uri_mismatch";
      result.hint = `Adicione exatamente este URI em "Authorized redirect URIs" no Google Cloud Console:\n${redirectUri}`;
    } else if (lower.includes("invalid_client") || lower.includes("erro 401: invalid_client")) {
      result.error = "invalid_client";
      result.hint = "Client ID/Secret inválidos. Verifique GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.";
    } else if (lower.includes("admin_policy_enforced")) {
      result.error = "admin_policy_enforced";
      result.hint = "Política do workspace do Google bloqueia este app. Libere no admin.google.com.";
    } else if (lower.includes("access_denied")) {
      result.error = "access_denied";
      result.hint = "Acesso negado pela política do projeto Google.";
    } else if (lower.includes("accounts.google.com") || lower.includes("sign in") || lower.includes("escolha uma conta") || lower.includes("oauth")) {
      result.ok = true;
    } else {
      // Resposta inesperada — não bloqueia, apenas avisa
      result.ok = true;
      result.hint = "Não foi possível confirmar 100%, mas nenhum erro conhecido foi detectado.";
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    result.error = (e as Error).message;
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
