// Callback OAuth do Google: troca o code por tokens e salva no banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;

const sanitizeReturnTo = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
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

const withDriveStatus = (returnTo: string, status: "connected" | "error", message?: string) => {
  const url = new URL(returnTo);
  url.searchParams.set("drive", status);
  if (message) url.searchParams.set("message", message.slice(0, 160));
  return url.toString();
};

const html = (title: string, body: string) => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{background:#1e293b;padding:32px 40px;border-radius:12px;max-width:480px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.4)}
  h1{margin:0 0 12px;font-size:20px} p{margin:8px 0;color:#94a3b8;font-size:14px}
  a{color:#10b981;text-decoration:none;display:inline-block;margin-top:16px;padding:10px 20px;background:#064e3b;border-radius:8px}</style>
  </head><body><div class="card">${body}</div></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } },
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return html("Erro", `<h1>❌ Erro do Google</h1><p>${error}</p>`);
  if (!code || !state) return html("Erro", `<h1>❌ Parâmetros faltando</h1>`);

  try {
    const decoded = JSON.parse(atob(state));
    const uid = decoded.uid as string;
    const returnTo = sanitizeReturnTo(decoded.returnTo);

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-drive-oauth-callback`;
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tok = await tokenResp.json();
    if (!tokenResp.ok) {
      if (returnTo) {
        return Response.redirect(withDriveStatus(returnTo, "error", "Falha ao trocar autorização do Google."), 303);
      }
      return html("Erro", `<h1>❌ Falha ao trocar code</h1><p>${JSON.stringify(tok)}</p>`);
    }
    if (!tok.refresh_token) {
      return html("Atenção", `<h1>⚠️ Sem refresh_token</h1>
        <p>Revogue o acesso em <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> e tente novamente.</p>`);
    }

    // Pega o email do usuário
    let email = "";
    try {
      const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const uj = await ui.json();
      email = uj.email || "";
    } catch { /* ignore */ }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const expiresAt = new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString();

    // Substitui qualquer conexão anterior
    await admin.from("google_drive_oauth").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: insErr } = await admin.from("google_drive_oauth").insert({
      account_email: email,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      token_expires_at: expiresAt,
      scope: tok.scope,
      connected_by: uid,
    });
    if (insErr) return html("Erro", `<h1>❌ ${insErr.message}</h1>`);

    if (returnTo) {
      return Response.redirect(withDriveStatus(returnTo, "connected"), 303);
    }

    return html("Conectado",
      `<h1>✅ Google Drive conectado!</h1>
       <p>Conta: <strong>${email}</strong></p>
       <p>Os backups serão enviados pra essa conta automaticamente.</p>
       <a href="javascript:window.close()">Fechar janela</a>`);
  } catch (e) {
    return html("Erro", `<h1>❌ ${(e as Error).message}</h1>`);
  }
});
