import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking wapi_config...");
  const { data: cfg, error: cfgErr } = await supabase
    .from("wapi_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (cfgErr) {
    console.error("Error reading wapi_config:", cfgErr);
  } else {
    console.log("Config Enabled:", cfg?.enabled);
    console.log("Last Dispatched At:", cfg?.last_dispatched_at);
    console.log("Instance URL:", cfg?.instance_url ? "Set" : "Not Set");
    console.log("Instance Token:", cfg?.instance_token ? "Set" : "Not Set");
  }

  console.log("\nChecking wapi_outbox pending count...");
  const { data: outbox, error: outErr } = await supabase
    .from("wapi_outbox")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(50);
  
  if (outErr) {
    console.error("Error reading wapi_outbox:", outErr);
  } else {
    const pending = outbox.filter(o => o.status === 'pending').length;
    const sent = outbox.filter(o => o.status === 'sent').length;
    const failed = outbox.filter(o => o.status === 'failed').length;
    console.log(`Last 50 messages -> Pending: ${pending}, Sent: ${sent}, Failed: ${failed}`);
  }

  console.log("\nChecking wapi_message_logs for recent errors...");
  const { data: logs, error: logsErr } = await supabase
    .from("wapi_message_logs")
    .select("status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (logsErr) {
    console.error("Error reading wapi_message_logs:", logsErr);
  } else {
    console.log("Recent logs:", logs);
  }
}

run();
