// Testa a edge function com isEndOfShift = true e imageUrl preenchido
// node scratch/test_edge_fn.cjs
const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function test(label, body) {
  console.log(`\n--- ${label} ---`);
  console.log("Body:", JSON.stringify(body, null, 2));
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log(`HTTP ${resp.status}:`, JSON.stringify(json, null, 2));
  return json;
}

async function run() {
  // Caso 1: só status de fim de turno (sem imagem)
  await test("Caso 1: Fim de turno SEM imagem", {
    equipmentId: "test-eq-123",
    equipmentName: "Equipamento Teste",
    plate: "TST-0001",
    newStatus: "end_of_shift",
    previousStatus: "none",
    driverName: "Motorista Teste",
    helperName: null,
    extraInfo: "*Combustível final:* Cheio",
    shiftRecordId: "test-shift-abc",
    imageUrl: null,
    timestamp: new Date().toISOString(),
  });

  // Caso 2: com imagem
  await test("Caso 2: Fim de turno COM imagem (PNG fictício)", {
    equipmentId: "test-eq-123",
    equipmentName: "Equipamento Teste",
    plate: "TST-0001",
    newStatus: "end_of_shift",
    previousStatus: "none",
    driverName: "Motorista Teste",
    helperName: null,
    extraInfo: "*Combustível final:* Cheio\n*Horímetro:* 9999\n*KM:* 12345",
    shiftRecordId: "test-shift-abc",
    imageUrl: "https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/parte-diaria/test.png",
    imageCaption: "📄 *PARTE DIÁRIA*\nEquipamento Teste — TST-0001\nMotorista: Motorista Teste",
    timestamp: new Date().toISOString(),
  });

  // Caso 3: checar outbox depois dos testes
  console.log("\n--- Verificando wapi_outbox após testes ---");
  const outboxResp = await fetch(`${SUPABASE_URL}/rest/v1/wapi_outbox?select=*&order=created_at.desc&limit=5`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  const outbox = await outboxResp.json();
  if (outbox.length === 0) {
    console.log("⚠️  Outbox ainda VAZIO! A Edge Function não está enfileirando mensagens.");
    console.log("   Isso significa que a função está fazendo early return ANTES de inserir no wapi_outbox.");
  } else {
    outbox.forEach((m, i) => {
      console.log(`[${i+1}] id=${m.id} | status=${m.status} | kind=${m.kind} | origin=${m.origin} | external_kind=${m.external_kind}`);
      if (m.last_error) console.log(`    ❌ erro: ${m.last_error}`);
    });
  }
}

run().catch(console.error);
