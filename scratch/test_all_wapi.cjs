const fs = require('fs');

const supabaseUrl = "https://fcaxyvptfwnwfctxkqre.supabase.co";

const fns = [
  "wapi-adubo-notify",
  "wapi-aso-notify",
  "wapi-ata-contrato-notify",
  "wapi-attendance-missing-notify",
  "wapi-attendance-notify",
  "wapi-billing-notify",
  "wapi-campaign-notify",
  "wapi-chat-notify",
  "wapi-cronograma-mirante-notify",
  "wapi-dds-notify",
  "wapi-dds-photo-notify",
  "wapi-desvio-correction-notify",
  "wapi-desvio-due-notify",
  "wapi-desvio-notify",
  "wapi-desvio-status-notify",
  "wapi-driver-app-reminder",
  "wapi-driver-status-notify",
  "wapi-equipment-movement-notify",
  "wapi-forbidden-color-notify",
  "wapi-inventory-change-notify",
  "wapi-low-stock-notify",
  "wapi-matrix-notify",
  "wapi-order-notify",
  "wapi-planned-activities-notify",
  "wapi-planning-notify",
  "wapi-pos-chuva-notify",
  "wapi-reminder-snooze-notify",
  "wapi-reminders-notify",
  "wapi-requisition-notify",
  "wapi-shift-end-reminder",
  "wapi-site-inspection-done-notify",
  "wapi-sling-inspection-notify",
  "wapi-training-notify",
  "wapi-vehicle-inspection-notify"
];

async function run() {
  console.log(`Testando ${fns.length} funcoes...`);
  const results = [];
  
  for (const fn of fns) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const text = await res.text();
      results.push({ fn, status: res.status, ok: res.ok, body: text });
      console.log(`[${res.status}] ${fn}: ${text.slice(0, 100)}...`);
    } catch (e) {
      console.error(`Erro ao chamar ${fn}:`, e.message);
      results.push({ fn, ok: false, error: e.message });
    }
  }

  console.log("\nAcionando queue-worker...");
  try {
    const qRes = await fetch(`${supabaseUrl}/functions/v1/wapi-queue-worker`, { method: 'POST' });
    const qText = await qRes.text();
    console.log("Queue Worker:", qText);
  } catch (e) {
    console.error("Queue Worker erro:", e.message);
  }

  console.log("\nResumo das falhas (status != 200):");
  const failed = results.filter(r => !r.ok);
  if (failed.length === 0) {
    console.log("Todas as funções responderam com sucesso!");
  } else {
    failed.forEach(f => {
      console.log(`${f.fn} -> ${f.status} ${f.error || f.body.slice(0,100)}`);
    });
  }
}

run();
