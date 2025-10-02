import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface NotaFiscal {
  id: string
  numero_nota: string
  valor_nota: number
  destinatario: string
  cidade_destino: string
  quantidade_volumes: number
  created_at: string
}