import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Security check: only allow calls with a specific secret
    const backupSecret = "daily-backup-secure-token-2026"
    if (req.headers.get('x-backup-secret') !== backupSecret) {
      console.error('Unauthorized backup attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Get list of tables via RPC
    const { data: tablesList, error: listError } = await supabaseAdmin
      .rpc('get_tables_info')

    if (listError) {
      console.error('Error listing tables:', listError)
      throw listError
    }

    const backupData: Record<string, any> = {}
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')
    const dateFolder = now.toISOString().split('T')[0] // YYYY-MM-DD
    const fileName = `backups/${dateFolder}/full_backup_${timestamp}.json`

    console.log(`Found ${tablesList.length} tables to backup.`)

    for (const table of tablesList) {
      const tableName = table.table_name
      // Skip some tables that might be too large or unnecessary for a general backup
      if (tableName === 'wapi_message_logs' || tableName === 'chat_notification_logs') {
        console.log(`Skipping large log table: ${tableName}`)
        continue
      }

      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')

      if (error) {
        console.warn(`Could not backup table ${tableName}:`, error.message)
        backupData[tableName] = { error: error.message }
      } else {
        backupData[tableName] = data
      }
    }

    const fileContent = JSON.stringify(backupData)
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('database-backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading backup:', uploadError)
      throw uploadError
    }

    console.log(`Backup completed successfully: ${fileName}`)

    // Optional: Send a WhatsApp notification if wapi-send is available
    // (Skipping for now to keep it robust)

    return new Response(
      JSON.stringify({ 
        message: 'Backup completed successfully', 
        file: fileName,
        tablesCount: Object.keys(backupData).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Backup failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
