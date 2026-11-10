import { Link } from 'react-router-dom'
import { Check, CircleDollarSign, MoreVertical, Package, Pencil, Trash2, UserX, XCircle } from 'lucide-react'
import { fmtData, fmtHora, fmtMoeda, STATUS, STATUS_PAG } from '../lib/format'
import { mensagemErro, run, supabase } from '../lib/supabase'
import { Badge, Menu, useConfirmar, useToast } from './ui'

/** Uma linha de sessão (atendimento) com ações rápidas. */
export default function SessaoItem({ a, mostrarCliente = true, mostrarData = false, onMudou, onEditar, onPagar }) {
  const toast = useToast()
  const confirmar = useConfirmar()
  const st = STATUS[a.status]
  const pg = STATUS_PAG[a.status_pagamento]

  async function mudarStatus(status) {
    try {
      await run(supabase.from('atendimentos').update({ status }).eq('id', a.id))
      toast(`Sessão marcada como “${STATUS[status].label}”`)
      onMudou?.()
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: 'Excluir sessão?',
      texto: 'A sessão e os pagamentos ligados a ela serão apagados. Isso não pode ser desfeito.',
      botao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    try {
      await run(supabase.from('atendimentos').delete().eq('id', a.id))
      toast('Sessão excluída')
      onMudou?.()
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  return (
    <div className={`sessao sessao-${a.status}`}>
      <div className="sessao-hora">
        {mostrarData && <span className="sessao-dia">{fmtData(a.data_hora).slice(0, 5)}</span>}
        <strong>{fmtHora(a.data_hora)}</strong>
      </div>
      <div className="sessao-info">
        {mostrarCliente ? (
          <Link to={`/clientes/${a.cliente_id}`} className="sessao-cliente">
            {a.cliente_nome}
          </Link>
        ) : (
          <span className="sessao-cliente">{a.tratamento_nome || 'Sessão'}</span>
        )}
        <span className="sessao-detalhe">
          {mostrarCliente && (a.tratamento_nome || 'Sessão')}
          {a.pacote_id && (
            <span className="sessao-pacote">
              <Package size={13} /> {a.pacote_descricao}
            </span>
          )}
          {a.observacoes && <span className="sessao-obs">{a.observacoes}</span>}
        </span>
      </div>
      <div className="sessao-badges">
        <Badge tom={st.tom}>{st.label}</Badge>
        {a.status !== 'cancelado' && a.status_pagamento !== 'na' && (
          <Badge tom={pg.tom}>
            {a.status_pagamento === 'parcial' ? `Falta ${fmtMoeda(a.saldo)}` : `${pg.label} · ${fmtMoeda(a.valor)}`}
          </Badge>
        )}
      </div>
      <Menu
        icone={<MoreVertical size={18} />}
        itens={[
          a.status !== 'realizado' && { label: 'Marcar como realizada', icone: Check, onClick: () => mudarStatus('realizado') },
          a.status !== 'faltou' && { label: 'Marcar falta', icone: UserX, onClick: () => mudarStatus('faltou') },
          a.status !== 'cancelado' && { label: 'Cancelar sessão', icone: XCircle, onClick: () => mudarStatus('cancelado') },
          a.saldo > 0 && a.status !== 'cancelado' && onPagar && { label: 'Registrar pagamento', icone: CircleDollarSign, onClick: () => onPagar(a) },
          onEditar && { label: 'Editar', icone: Pencil, onClick: () => onEditar(a) },
          { label: 'Excluir', icone: Trash2, perigo: true, onClick: excluir },
        ]}
      />
    </div>
  )
}
