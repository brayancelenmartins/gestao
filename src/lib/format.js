const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtMoeda = (v) => moeda.format(Number(v || 0))

/** Para campos date (YYYY-MM-DD), sem conversão de fuso. */
export function fmtDia(dia) {
  if (!dia) return '—'
  const [a, m, d] = String(dia).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function fmtHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDataHora(iso) {
  if (!iso) return '—'
  return `${fmtData(iso)} às ${fmtHora(iso)}`
}

export function fmtDiaSemana(iso) {
  const d = new Date(iso)
  const hoje = inicioDoDia(new Date())
  const alvo = inicioDoDia(d)
  const diff = Math.round((alvo - hoje) / 86400000)
  const txt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (diff === 0) return `Hoje · ${txt}`
  if (diff === 1) return `Amanhã · ${txt}`
  if (diff === -1) return `Ontem · ${txt}`
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export function inicioDoDia(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDias(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Data local em YYYY-MM-DD */
export function diaLocal(d = new Date()) {
  const x = new Date(d)
  const off = x.getTimezoneOffset()
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 10)
}

/** ISO -> valor para <input type="datetime-local"> */
export function toInputDataHora(iso) {
  let d = iso ? new Date(iso) : new Date()
  if (!iso) {
    // padrão: próxima hora cheia
    d.setHours(d.getHours() + 1, 0, 0, 0)
  }
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

/** Remove acentos e deixa em minúsculas para pesquisa. */
export const normalizar = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function iniciais(nome) {
  const partes = (nome || '?').trim().split(/\s+/)
  const a = partes[0]?.[0] || ''
  const b = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (a + b).toUpperCase()
}

export function soDigitos(s) {
  return (s || '').replace(/\D/g, '')
}

export function linkWhatsApp(tel) {
  let n = soDigitos(tel)
  if (!n) return null
  if (n.length <= 11) n = '55' + n
  return `https://wa.me/${n}`
}

export const STATUS = {
  agendado: { label: 'Agendado', tom: 'info' },
  realizado: { label: 'Realizado', tom: 'success' },
  faltou: { label: 'Faltou', tom: 'warning' },
  cancelado: { label: 'Cancelado', tom: 'muted' },
}

export const STATUS_PAG = {
  pago: { label: 'Pago', tom: 'success' },
  parcial: { label: 'Parcial', tom: 'warning' },
  pendente: { label: 'Não pago', tom: 'danger' },
  na: { label: 'Sem cobrança', tom: 'muted' },
}

export const FORMAS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência',
  outro: 'Outro',
}
