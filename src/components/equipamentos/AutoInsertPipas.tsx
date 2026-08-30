import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const PIPAS_TO_INSERT = [
  { name: "PIPA", plate: "SKK6I64", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" },
  { name: "PIPA", plate: "RQN2D45", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" },
  { name: "PIPA", plate: "RQS3F79", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" },
  { name: "PIPA", plate: "SKR6B90", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" },
  { name: "PIPA", plate: "RQR7I03", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" },
  { name: "PIPA", plate: "SKQ7H63", equipment_type: "pipa", start_hour: 7, end_hour: 17, mobilization_status: "mobilizado", driver: "", helper: "" }
];

export function AutoInsertPipas() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function checkAndInsert() {
      try {
        console.log("Checking PIPAS to insert...");
        for (const pipa of PIPAS_TO_INSERT) {
          // Check if it exists
          const { data, error } = await supabase
            .from("equipment")
            .select("id")
            .eq("plate", pipa.plate)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking pipa", pipa.plate, error);
            continue;
          }
          
          if (!data) {
            console.log("Inserting missing PIPA:", pipa.plate);
            const { error: insertError } = await supabase
              .from("equipment")
              .insert([pipa]);
            if (insertError) {
              console.error("Failed to insert PIPA", pipa.plate, insertError);
            } else {
              console.log("Successfully inserted PIPA", pipa.plate);
            }
          } else {
            console.log("PIPA already exists:", pipa.plate);
          }
        }
      } catch (err) {
        console.error("Failed to run AutoInsertPipas", err);
      }
    }
    
    checkAndInsert();
  }, []);

  return null;
}
