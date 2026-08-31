const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

async function run() {
  const largeString = "a".repeat(2 * 1024 * 1024); // 2MB string
  const base64Str = "data:image/png;base64," + Buffer.from(largeString).toString('base64');
  
  const testBody = {
    equipmentId: "test-eq-123",
    newStatus: "end_of_shift",
    imageBase64: base64Str,
    timestamp: new Date().toISOString(),
  };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-driver-status-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(testBody),
  });

  console.log("Status:", resp.status);
  console.log("Body:", await resp.text());
}
run().catch(console.error);
