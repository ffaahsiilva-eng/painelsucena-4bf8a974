const SUPABASE_URL = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

// Try to sign in with a test user to bypass RLS
// First, let's just see what RLS policies exist by trying the query
// We'll sign in with the service role key if available

async function run() {
  // The anon key might have RLS restrictions. Let's try to see if there's
  // a service_role key. Otherwise, let's create a debug API endpoint.
  
  // Actually - let's query the schema to understand what columns exist
  const url = `${SUPABASE_URL}/rest/v1/equipment_movements?select=*&limit=1&order=created_at.desc`;
  const res = await fetch(url, {
    headers: { 
      'apikey': SUPABASE_KEY, 
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  const body = await res.text();
  console.log("Raw movements response:", body);
  
  // Also check if the table has an environment column
  const url2 = `${SUPABASE_URL}/rest/v1/equipment?select=*&limit=1`;
  const res2 = await fetch(url2, {
    headers: { 
      'apikey': SUPABASE_KEY, 
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  const body2 = await res2.text();
  console.log("Raw equipment response:", body2);
}

run().catch(console.error);
