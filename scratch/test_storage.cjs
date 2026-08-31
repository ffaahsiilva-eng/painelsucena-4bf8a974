const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function run() {
  const uniqueUrl = "https://via.placeholder.com/800x600.png?text=Teste+" + Date.now();
  console.log("=== Teste: enviar com URL de imagem unica ===", uniqueUrl);
  const body = {
    equipmentId: "00000000-0000-0000-0000-000000000001",
    equipmentName: "CAMINHÃO TESTE",
    plate: "TST-TEST",
    newStatus: "end_of_shift",
    previousStatus: "none",
    driverName: "Teste Diagnóstico",
    helperName: null,
    extraInfo: "*Combustível final:* Cheio\n*Horímetro:* 9999",
    shiftRecordId: "diag-" + Date.now(),
    imageUrl: uniqueUrl,
    imageCaption: "📄 *PARTE DIÁRIA DIAGNÓSTICO*\nCAMINHÃO TESTE — TST-TEST\nMotorista: Teste Diagnóstico",
    timestamp: new Date().toISOString(),
  };

  const fnResp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });
  const fnJson = await fnResp.json().catch(() => ({}));
  console.log(`Edge fn HTTP ${fnResp.status}:`, JSON.stringify(fnJson));

  await new Promise(r => setTimeout(r, 1000));
  console.log("\n=== Rodando worker ===");
  const wResp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-queue-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
    body: JSON.stringify({}),
  });
  const wJson = await wResp.json().catch(() => ({}));
  console.log(`Worker HTTP ${wResp.status}:`, JSON.stringify(wJson));
}

run().catch(console.error);
