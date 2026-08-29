async function drainQueue() {
  const url = 'https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/wapi-queue-worker';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18';
  
  let totalProcessed = 0;
  while (true) {
    console.log("Triggering queue worker...");
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch(e) {
        console.error("Failed to parse:", text);
        break;
      }
      const processed = data.processed || 0;
      console.log(`Status: ${resp.status}, Processed: ${processed}`);
      totalProcessed += processed;
      if (processed === 0) {
        console.log(`Queue drained. Total processed in this run: ${totalProcessed}`);
        break;
      }
    } catch (e) {
      console.error(e);
      break;
    }
  }
}

drainQueue();
