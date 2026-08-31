import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, name, equipment_type, environment')

  if (error) {
    console.error(error)
  } else {
    console.log("Total count:", data.length)
    console.log(JSON.stringify(data, null, 2))
  }
}

check()
