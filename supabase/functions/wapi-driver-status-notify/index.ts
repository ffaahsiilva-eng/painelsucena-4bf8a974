// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  none: "▶️ Operando",
  operando: "▶️ Operando",
  waiting: "⏸️ Aguardando Frente",
  rain: "🌧️ Parado (Chuva)",
  end_of_day: "⛽ Abastecendo",
  abastecimento: "💧 Abastecendo Água",
  end_of_shift: "🌙 Fim de Turno",
  maintenance: "🔧 Manutenção",
  shift_start: "🟢 Início de Turno",
  almoco: "🍽️ Almoço",
  servico: "🛠️ Serviço",

};

const isUsableDriverName = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== "—" &&
      normalized !== "-" &&
      normalized !== "motorista" &&
      !normalized.startsWith("sistema")
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const {
      equipmentId,
      equipmentName,
      plate,
      newStatus,
      previousStatus,
      driverName,
      waterPoint,
      extraInfo,
      shiftRecordId,
      imageUrl,
      imageCaption,
      timestamp,
      helperName,
    } = payload || {};

    if (!newStatus) {
      return new Response(JSON.stringify({ error: "newStatus é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || cfg.auto_send_driver_status === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_driver_status || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup equipment if not provided
    let eqName = equipmentName || "—";
    let eqPlate = plate || "—";
    let eqDriver = "";
    let shiftDriver = "";
    let latestStatusDriver = "";
    let eqHelper = helperName || "";
    if (equipmentId && (!equipmentName || !plate)) {
      const { data: eq } = await admin
        .from("equipment")
        .select("name, plate, driver, helper")
        .eq("id", equipmentId)
        .maybeSingle();
      if (eq) {
        eqName = eq.name || eqName;
        eqPlate = eq.plate || eqPlate;
        eqDriver = eq.driver || "";
        eqHelper = eqHelper || eq.helper || "";
      }
    }

    if (equipmentId && (!eqDriver || !eqHelper)) {
      const { data: eq } = await admin
        .from("equipment")
        .select("driver, helper")
        .eq("id", equipmentId)
        .maybeSingle();
      eqDriver = eqDriver || eq?.driver || "";
      eqHelper = eqHelper || eq?.helper || "";
    }

    if (equipmentId) {
      const paraDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: shift } = await admin
        .from("daily_shift_records")
        .select("driver_name, helper_name")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", paraDate)
        .is("shift_end_time", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      shiftDriver = shift?.driver_name || "";
      eqHelper = eqHelper || shift?.helper_name || "";

      const { data: latestHistory } = await admin
        .from("equipment_stop_history")
        .select("changed_by_driver")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      latestStatusDriver = latestHistory?.changed_by_driver || "";
    }

    const resolvedDriverName =
      isUsableDriverName(driverName)
        ? driverName.trim()
        : isUsableDriverName(shiftDriver)
          ? shiftDriver.trim()
          : isUsableDriverName(latestStatusDriver)
            ? latestStatusDriver.trim()
            : isUsableDriverName(eqDriver)
              ? eqDriver.trim()
              : "—";

    let newLabel = STATUS_LABELS[newStatus] || newStatus;
    const prevLabel = previousStatus ? (STATUS_LABELS[previousStatus] || previousStatus) : null;
    const isEndOfShift = newStatus === "end_of_shift" || newStatus === "fim_turno";

    // Correção: Se tiver ponto de água, NUNCA usar o emoji de combustível
    // A dupla-chamada (end_of_day + abastecimento) gerava duas mensagens. 
    // Vamos garantir que se houver ponto de água, o label é sempre "💧 Abastecendo Água"
    // e vamos abortar se for uma chamada explícita de end_of_day com waterPoint para evitar duplo envio.
    if (waterPoint) {
      if (newStatus === "end_of_day") {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "ignore-fuel-msg-for-water-point" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newLabel = "💧 Abastecendo Água";
    }

    // Fim de Turno já tem o texto oficial enviado pelo trigger da Parte Diária.
    // Aqui mantemos apenas o envio opcional do PNG, evitando o texto genérico duplicado.
    if (isEndOfShift && !imageUrl) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "end-of-shift-text-disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se fornecido um timestamp original pelo frontend (ex: ação offline), usa ele. Senão, usa agora.
    const now = timestamp ? new Date(timestamp) : new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dateBR = paraTime.toISOString().slice(0, 10).split("-").reverse().join("/");
    const timeBR = paraTime.toISOString().slice(11, 16);

    let message =
      `🚜 *STATUS DO EQUIPAMENTO*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Equipamento:* ${eqName}\n` +
      `*Placa/ID:* ${eqPlate}\n` +
      `*Data:* ${dateBR}\n` +
      `*Horário:* ${timeBR}\n`;

    if (prevLabel) {
      message += `*Mudança:* ${prevLabel} → ${newLabel}\n`;
    } else {
      message += `*Status:* ${newLabel}\n`;
    }

    if (waterPoint) {
      message += `*Ponto de Água:* ${waterPoint}\n`;
    }
    if (extraInfo) {
      message += `\n${extraInfo}\n`;
    }

    message +=
      `\n*Motorista:* ${resolvedDriverName}\n`;
    if (eqHelper && eqHelper !== "—" && eqHelper !== "-") {
      message += `*Ajudante:* ${eqHelper}\n`;
    }
    message += `━━━━━━━━━━━━━━━━━━━━`;

    // Dedup robusto: se já existe QUALQUER mensagem com o mesmo status
    // (newLabel) para este equipamento nos últimos 10 minutos, ignora.
    let recentOutbox = null;
    if (equipmentId && !isEndOfShift) {
      const { data: sameStatusRecent } = await admin
        .from("wapi_outbox")
        .select("id, status, message")
        .eq("origin", "driver-status")
        .eq("external_kind", "equipment-status")
        .eq("external_id", equipmentId)
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      const dup = (sameStatusRecent || []).find((r) =>
        typeof r.message === "string" && 
        r.message.includes(newLabel) &&
        (!waterPoint || r.message.includes(String(waterPoint).trim())) &&
        (resolvedDriverName === "—" || r.message.includes(resolvedDriverName)) &&
        (!extraInfo || r.message.includes(String(extraInfo).trim()))
      );
      if (dup) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "duplicate-status" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Edição da última pending nos últimos 30s (mesmo equipamento, status diferente)
      recentOutbox = (sameStatusRecent || []).find(
        (r) =>
          r.status === "pending" &&
          (resolvedDriverName === "—" ||
            typeof r.message !== "string" ||
            r.message.includes(resolvedDriverName))
      ) || null;
    }

    if (!isEndOfShift && recentOutbox?.id) {
      const { error: updateError } = await admin
        .from("wapi_outbox")
        .update({
          kind: "text",
          target_type: "group",
          phone: targetGroupId,
          message,
        })
        .eq("id", recentOutbox.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isEndOfShift) {
      const { error } = await admin.from("wapi_outbox").insert({
        kind: "text",
        target_type: "group",
        phone: targetGroupId,
        message,
        origin: "driver-status",
        external_kind: equipmentId ? "equipment-status" : null,
        external_id: equipmentId || null,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Optional: also enqueue an image (e.g. Parte Diária PNG) to the same group.
    if (imageUrl && typeof imageUrl === "string") {
      // Diferencia PNG de FIM DE TURNO das PNGs de meio-turno para dedup limpo.
      const pngKind = isEndOfShift ? "daily-shift-png-end" : "daily-shift-png";

      // 1) Dedup por shiftRecordId + kind (evita duplicar a MESMA parte diária de fim de turno)
      if (shiftRecordId) {
        const { data: existingImage } = await admin
          .from("wapi_outbox")
          .select("id")
          .eq("origin", "driver-status")
          .eq("external_kind", pngKind)
          .eq("external_id", shiftRecordId)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);

        if (existingImage && existingImage.length > 0) {
          return new Response(JSON.stringify({ success: true, queued: true, imageSkipped: "duplicate-shift" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // 2) Dedup por equipamento + dia + kind — só aplicado quando NÃO temos shiftRecordId
      //    (com shiftRecordId a dedup do passo 1 já é precisa por turno). Isso evita
      //    que um PNG enfileirado tarde (backfill de outro turno enviado hoje) bloqueie
      //    o PNG do fim de turno real do dia.
      if (!shiftRecordId && equipmentId) {
        const paraDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const { data: existingDayImage } = await admin
          .from("wapi_outbox")
          .select("id")
          .eq("origin", "driver-status")
          .eq("external_kind", pngKind)
          .ilike("caption", `%${eqName}%`)
          .gte("created_at", `${paraDate}T03:00:00.000Z`)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);

        if (existingDayImage && existingDayImage.length > 0) {
          return new Response(JSON.stringify({ success: true, queued: true, imageSkipped: "duplicate-equipment-day" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }


      const { error: imgErr } = await admin.from("wapi_outbox").insert({
        kind: "image",
        target_type: "group",
        phone: targetGroupId,
        image_url: imageUrl,
        caption: imageCaption || `📄 Parte Diária — ${eqName} (${eqPlate})`,
        origin: "driver-status",
        external_kind: pngKind,
        external_id: shiftRecordId || equipmentId || null,
        dedupe_key: shiftRecordId
          ? `driver-status|${pngKind}|${shiftRecordId}`
          : equipmentId
            ? `driver-status|${pngKind}|${equipmentId}|${new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)}`
            : null,
      });
      if (imgErr) console.warn("[wapi-driver-status-notify] image enqueue error", imgErr);
    }

    return new Response(JSON.stringify({ success: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-driver-status-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
