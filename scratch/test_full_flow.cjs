// Teste completo do fluxo de fim de turno
// Executa: node scratch/test_full_flow.cjs
const https = require('https');

const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, opts);
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: resp.status, ok: resp.ok, json };
}

async function run() {
  console.log("=== DIAGNÓSTICO COMPLETO DO SISTEMA WHATSAPP ===\n");

  // 1. Checar wapi_config
  console.log("1. Verificando wapi_config...");
  const cfgRes = await fetchJson(`${SUPABASE_URL}/rest/v1/wapi_config?select=*&limit=5`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  console.log(`   Status: ${cfgRes.status}`);
  console.log(`   Dados:`, JSON.stringify(cfgRes.json, null, 2));

  if (!cfgRes.ok || !cfgRes.json || cfgRes.json.length === 0) {
    console.log("\n   ⚠️  wapi_config está VAZIO ou inacessível!");
    console.log("   → Isso é a causa raiz. Sem configuração, nada funciona.");
    console.log("   → Verifique a tabela wapi_config no Supabase Dashboard e confirme se há registros e se 'enabled = true'.");
  } else {
    const cfg = cfgRes.json[0];
    console.log(`   ✅ Config encontrada: enabled=${cfg.enabled}, instance_id=${cfg.instance_id}`);
    if (!cfg.enabled) console.log("   ⚠️  ATENÇÃO: enabled = false. O sistema está DESATIVADO!");
    if (!cfg.group_id) console.log("   ⚠️  ATENÇÃO: group_id está vazio. Mensagens de grupo não serão enviadas!");
  }

  // 2. Checar wapi_outbox (últimas 5 entradas)
  console.log("\n2. Verificando wapi_outbox (últimas 5 entradas)...");
  const outboxRes = await fetchJson(`${SUPABASE_URL}/rest/v1/wapi_outbox?select=id,kind,status,origin,external_kind,message,caption,last_error,created_at&order=created_at.desc&limit=5`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  console.log(`   Status: ${outboxRes.status}`);
  if (outboxRes.ok && outboxRes.json) {
    if (outboxRes.json.length === 0) {
      console.log("   ⚠️  Outbox VAZIO. Nenhuma mensagem foi enfileirada.");
    } else {
      outboxRes.json.forEach((msg, i) => {
        console.log(`   [${i+1}] status=${msg.status} | kind=${msg.kind} | origin=${msg.origin} | ext_kind=${msg.external_kind}`);
        if (msg.last_error) console.log(`       ❌ Erro: ${msg.last_error}`);
        if (msg.caption) console.log(`       caption: ${String(msg.caption).slice(0, 80)}...`);
        if (msg.message) console.log(`       message: ${String(msg.message).slice(0, 80)}...`);
      });
    }
  } else {
    console.log("   ❌ Erro ao acessar outbox:", outboxRes.json);
  }

  // 3. Testar a Edge Function diretamente
  console.log("\n3. Testando Edge Function wapi-driver-status-notify...");
  const testBody = {
    equipmentId: "test-eq-id",
    equipmentName: "Equipamento Teste",
    plate: "TST-0001",
    newStatus: "end_of_shift",
    previousStatus: "none",
    driverName: "Motorista Teste",
    helperName: null,
    extraInfo: "*Combustível final:* Cheio\n*Horímetro:* 9999\n*KM:* 12345",
    shiftRecordId: "test-shift-id",
    imageUrl: null,
    timestamp: new Date().toISOString(),
  };

  const fnRes = await fetchJson(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(testBody),
  });
  console.log(`   Status HTTP: ${fnRes.status}`);
  console.log(`   Resposta:`, JSON.stringify(fnRes.json, null, 2));

  if (!fnRes.ok) {
    console.log("   ❌ A Edge Function retornou erro! Verifique os logs no Supabase Dashboard.");
  } else {
    console.log("   ✅ Edge Function respondeu OK");
  }

  // 4. Testar o worker
  console.log("\n4. Testando wapi-queue-worker...");
  const workerRes = await fetchJson(`${SUPABASE_URL}/functions/v1/wapi-queue-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  console.log(`   Status HTTP: ${workerRes.status}`);
  console.log(`   Resposta:`, JSON.stringify(workerRes.json, null, 2));

  if (workerRes.json?.skipped === "wapi_disabled") {
    console.log("   ⚠️  Worker retornou wapi_disabled → wapi_config está vazio ou disabled=true no banco!");
  }

  console.log("\n=== FIM DO DIAGNÓSTICO ===");
}

run().catch(console.error);
