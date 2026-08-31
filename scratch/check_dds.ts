import { createClient } from '@supabase/supabase-js';

const url = 'https://fcaxyvptfwnwfctxkqre.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18';
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('dds_schedule').select('*').order('scheduled_date', { ascending: false }).limit(5);
  console.log("DDS Schedule:", data);
  if (error) console.log("Error:", error);
}
check();
