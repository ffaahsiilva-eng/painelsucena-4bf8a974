// Teste completo: gera um PNG de verdade e envia via edge function
// node scratch/test_send_png.cjs
const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function run() {
  // 1. Primeiro verificar se o wapi_config existe via a edge function de worker
  // O worker usa service_role internamente
  console.log("1. Testando queue worker (usa service_role internamente)...");
  const workerResp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-queue-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const workerJson = await workerResp.json();
  console.log("Worker response:", JSON.stringify(workerJson));
  
  if (workerJson.skipped === "wapi_disabled") {
    console.log("\n⚠️  PROBLEMA CONFIRMADO: wapi_config não existe ou está com enabled=false no banco!");
    console.log("   O sistema de envio de WhatsApp está completamente DESATIVADO por falta de configuração.");
    console.log("\n   Para ativar, você precisa entrar no Supabase Dashboard e verificar/inserir na tabela wapi_config:");
    console.log("   - enabled: true");
    console.log("   - instance_url: (URL da sua instância W-API)");
    console.log("   - instance_id: (ID da instância)");
    console.log("   - instance_token: (Token da instância)");
    console.log("   - group_id: (ID do grupo do WhatsApp)");
    return;
  }

  // 2. Testar com imageUrl real (precisa de uma imagem que exista no storage)
  console.log("\n2. Testando envio com imagem real...");
  
  // Primeiro, vamos tentar listar arquivos no storage parte-diaria
  const storageResp = await fetch(`${SUPABASE_URL}/storage/v1/object/list/parte-diaria`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ limit: 5, offset: 0 }),
  });
  const storageJson = await storageResp.json().catch(() => []);
  console.log("Storage files:", JSON.stringify(storageJson));

  if (Array.isArray(storageJson) && storageJson.length > 0) {
    const firstFile = storageJson[0];
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/parte-diaria/${firstFile.name}`;
    console.log(`\nUsando imagem existente: ${imageUrl}`);
    
    const body = {
      equipmentId: "test-eq-999",
      equipmentName: "CAMINHÃO TESTE",
      plate: "TST-9999",
      newStatus: "end_of_shift",
      previousStatus: "none",
      driverName: "Motorista Teste",
      helperName: null,
      extraInfo: "*Combustível final:* Cheio\n*Horímetro:* 9999\n*KM:* 12345",
      shiftRecordId: "test-shift-real-" + Date.now(),
      imageUrl,
      imageCaption: "📄 *PARTE DIÁRIA TESTE*\nCAMINHÃO TESTE — TST-9999\nMotorista: Motorista Teste",
      timestamp: new Date().toISOString(),
    };

    console.log("Enviando para edge function...");
    const fnResp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const fnJson = await fnResp.json().catch(() => ({}));
    console.log(`Edge function HTTP ${fnResp.status}:`, JSON.stringify(fnJson));

    // Aguardar e verificar outbox
    console.log("\nAguardando 2s e verificando outbox...");
    await new Promise(r => setTimeout(r, 2000));
    
    const outboxResp = await fetch(`${SUPABASE_URL}/rest/v1/wapi_outbox?select=id,kind,status,origin,external_kind,phone,image_url,caption,last_error,created_at&order=created_at.desc&limit=3`, {
      headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
    });
    const outbox = await outboxResp.json();
    
    if (!Array.isArray(outbox) || outbox.length === 0) {
      console.log("⚠️  Outbox vazio (RLS bloqueia leitura com anon key)");
      console.log("   Mas se a edge function retornou queued:true, o registro existe!");
      
      // Rodar o worker manualmente para processar
      console.log("\n3. Rodando worker para processar a fila...");
      const worker2Resp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-queue-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({}),
      });
      const worker2Json = await worker2Resp.json();
      console.log("Worker response:", JSON.stringify(worker2Json));
      
      if (worker2Json.processed > 0) {
        console.log(`✅ Worker processou ${worker2Json.processed} mensagem(ns)! Verifique o WhatsApp.`);
      } else if (worker2Json.skipped === "wapi_disabled") {
        console.log("❌ wapi_config NÃO CONFIGURADO. É isso que está impedindo tudo.");
      } else {
        console.log("Outbox provavelmente vazio ou sem config.");
      }
    } else {
      outbox.forEach((m, i) => {
        console.log(`[${i+1}] status=${m.status} | kind=${m.kind} | origin=${m.origin}`);
        if (m.last_error) console.log(`    ❌ erro: ${m.last_error}`);
        if (m.image_url) console.log(`    image: ${m.image_url.slice(0, 60)}...`);
      });
    }
  } else {
    console.log("Não há arquivos no storage parte-diaria ainda.");
    console.log("A função generateAndUploadParteDiariaPng precisa ser executada primeiro pelo browser.");
  }
}

run().catch(console.error);
