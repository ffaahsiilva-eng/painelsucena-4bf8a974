import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcaxyvptfwnwfctxkqre.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, order_number')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error("Erro ao buscar pedidos:", error);
    return;
  }

  console.log("Últimos 15 pedidos:");
  for (const o of orders) {
    console.log(`- ID: ${o.id} | Data: ${o.created_at} | Nº: ${o.order_number}`);
    
    // Check if created_at is from 2026-08-26
    if (o.created_at.startsWith('2026-08-26')) {
      console.log(`  -> Reenviando pedido...`);
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/wapi-order-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            orderId: o.id,
            eventType: 'created'
          })
        });
        const result = await response.json();
        console.log(`  -> Resultado:`, result);
      } catch (err) {
        console.error(`  -> Erro ao enviar:`, err);
      }
    }
  }
}

run();
