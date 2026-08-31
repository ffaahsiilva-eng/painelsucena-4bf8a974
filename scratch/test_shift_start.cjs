const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function run() {
  const wapiBody = {
    equipmentId: "b24426c7-40ad-4033-9823-652e487a9534",
    equipmentName: "Equipamento Teste",
    plate: "TST-0001",
    newStatus: "shift_start",
    previousStatus: null,
    driverName: "Motorista Teste",
    helperName: null,
    extraInfo: `*Combustível:* Cheio\n*Horímetro:* 10\n*KM:* 20`,
    timestamp: new Date().toISOString(),
  };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(wapiBody),
  });

  console.log("Status:", resp.status);
  console.log("Body:", await resp.text());
}
run().catch(console.error);
