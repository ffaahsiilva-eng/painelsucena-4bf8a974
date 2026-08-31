const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking wapi_config...");
  const { data: cfg, error: cfgErr } = await supabase
    .from('wapi_config')
    .select('*')
    .limit(1);
  
  if (cfgErr) console.error(cfgErr);
  else console.log('Config:', JSON.stringify(cfg, null, 2));
}
check();
