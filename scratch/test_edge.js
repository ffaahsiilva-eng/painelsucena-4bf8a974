import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.functions.invoke("wapi-driver-status-notify", {
    body: {
      equipmentId: "test", // Assuming it won't find it but won't crash
      equipmentName: "Test Vehicle",
      plate: "TST1234",
      newStatus: "waiting",
      previousStatus: null,
      driverName: "Test Driver",
      extraInfo: "*Combustível:* 1/2\n*Horímetro:* 100\n*KM:* 10",
      timestamp: new Date().toISOString()
    }
  });
  console.log("Response:", data);
  if (error) console.error("Error:", error);
}

run();
