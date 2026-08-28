const url = "https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/wapi-queue-worker";

async function run() {
  console.log("Triggering wapi-queue-worker...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
