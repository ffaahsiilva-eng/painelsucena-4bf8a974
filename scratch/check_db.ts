import { createClient } from '@supabase/supabase-js';

const url = 'https://fcaxyvptfwnwfctxkqre.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18';
const supabase = createClient(url, key);

async function check() {
  console.log("Checking wapi_config...");
  const { data: config, error: configErr } = await supabase
    .from('wapi_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);
  
  if (configErr) console.error("Config error:", configErr);
  else console.log("Config:", JSON.stringify(config, null, 2));
}

check();
