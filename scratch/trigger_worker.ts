async function triggerQueueWorker() {
  console.log("Triggering queue worker...");
  try {
    const url = 'https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/wapi-queue-worker';
    // Using anon key as authorization just in case
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const text = await resp.text();
    console.log(`Status: ${resp.status}`);
    console.log(`Response: ${text}`);
  } catch (e) {
    console.error(e);
  }
}

triggerQueueWorker();
