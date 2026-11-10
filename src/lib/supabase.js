import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && key)
export const supabase = configurado ? createClient(url, key) : null
export const NOME_CLINICA = import.meta.env.VITE_NOME_CLINICA || 'Clínica Estética'

/** Executa uma consulta do Supabase e lança o erro, se houver. */
export async function run(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

/** Traduz mensagens de erro comuns para português. */
export function mensagemErro(e) {
  const msg = e?.message || String(e)
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.'
  if (/row-level security/i.test(msg)) return 'Você não tem permissão para esta ação.'
  if (/foreign key/i.test(msg)) return 'Este registro está ligado a outros dados e não pode ser removido.'
  if (/duplicate key/i.test(msg)) return 'Já existe um registro com esse nome.'
  return msg
}
