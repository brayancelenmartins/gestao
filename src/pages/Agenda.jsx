import { useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { run, supabase } from '../lib/supabase'
import { useLoad } from '../lib/hooks'
import { addDias, diaLocal, fmtDiaSemana, inicioDoDia, STATUS } from '../lib/format'
import { Cabecalho } from '../components/Layout'
import { Chips, ErroCarregar, Spinner, Vazio } from '../components/ui'
import { AtendimentoForm, PagamentoForm } from '../components/Forms'
import SessaoItem from '../components/SessaoItem'

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'amanha', label: 'Amanhã' },
  { id: 'semana', label: 'Próximos 7 dias' },
  { id: 'mes', label: 'Próximos 30 dias' },
  { id: 'passadas', label: 'Últimos 30 dias' },
  { id: 'periodo', label: 'Escolher datas' },
]

function intervalo(periodo, de, ate) {
  const hoje = inicioDoDia(new Date())
  switch (periodo) {
    case 'hoje': return [hoje, addDias(hoje, 1)]
    case 'amanha': return [addDias(hoje, 1), addDias(hoje, 2)]
    case 'semana': return [hoje, addDias(hoje, 7)]
    case 'mes': return [hoje, addDias(hoje, 30)]
    case 'passadas': return [addDias(hoje, -30), hoje]
    default: {
      const a = de ? new Date(de + 'T00:00') : hoje
      const b = ate ? addDias(new Date(ate + 'T00:00'), 1) : addDias(a, 1)
      return [a, b]
    }
  }
}

export default function Agenda() {
  const [periodo, setPeriodo] = useState('semana')
  const [status, setStatus] = useState('')
  const [de, setDe] = useState(diaLocal())
  const [ate, setAte] = useState(diaLocal(addDias(new Date(), 7)))
  const [modal, setModal] = useState(null)

  const [ini, fim] = intervalo(periodo, de, ate)
  const { data, loading, error, reload } = useLoad(() => {
    let q = supabase
      .from('v_atendimentos')
      .select('*')
      .gte('data_hora', ini.toISOString())
      .lt('data_hora', fim.toISOString())
      .order('data_hora', { ascending: periodo !== 'passadas' })
    if (status) q = q.eq('status', status)
    return run(q)
  }, [ini.getTime(), fim.getTime(), status, periodo])

  const grupos = useMemo(() => {
    const g = new Map()
    for (const a of data || []) {
      const k = diaLocal(new Date(a.data_hora))
      if (!g.has(k)) g.set(k, [])
      g.get(k).push(a)
    }
    return [...g.entries()]
  }, [data])

  return (
    <div className="pagina">
      <Cabecalho titulo="Agenda" subtitulo={data ? `${data.length} sessões no período` : ' '}>
        <button className="btn btn-primario" onClick={() => setModal({ tipo: 'sessao' })}>
          <Plus size={17} /> Agendar
        </button>
      </Cabecalho>

      <Chips opcoes={PERIODOS} valor={periodo} onMudar={setPeriodo} />
      <div className="filtros">
        {periodo === 'periodo' && (
          <>
            <label className="filtro">
              <span>De</span>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className="filtro">
              <span>Até</span>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </label>
          </>
        )}
        <label className="filtro">
          <span>Situação</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <ErroCarregar erro={error} onTentar={reload} />}

      {loading && !data ? (
        <Spinner texto="Carregando agenda…" />
      ) : grupos.length === 0 ? (
        <Vazio icone={CalendarDays} titulo="Nenhuma sessão neste período">
          <button className="btn btn-primario btn-sm" onClick={() => setModal({ tipo: 'sessao' })}>
            <Plus size={16} /> Agendar sessão
          </button>
        </Vazio>
      ) : (
        grupos.map(([dia, itens]) => (
          <section key={dia} className="cartao">
            <div className="cartao-cabeca">
              <h2>{fmtDiaSemana(itens[0].data_hora)}</h2>
              <span className="muted">{itens.length} sess{itens.length === 1 ? 'ão' : 'ões'}</span>
            </div>
            <div className="lista-sessoes">
              {itens.map((a) => (
                <SessaoItem
                  key={a.id}
                  a={a}
                  onMudou={reload}
                  onEditar={(x) => setModal({ tipo: 'sessao', dados: x })}
                  onPagar={(x) => setModal({ tipo: 'pagamento', dados: x })}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <AtendimentoForm aberto={modal?.tipo === 'sessao'} inicial={modal?.dados} onFechar={() => setModal(null)} onSalvo={reload} />
      <PagamentoForm
        aberto={modal?.tipo === 'pagamento'}
        clienteId={modal?.dados?.cliente_id}
        alvo={modal?.dados ? { tipo: 'atendimento', id: modal.dados.id, saldo: modal.dados.saldo } : null}
        onFechar={() => setModal(null)}
        onSalvo={reload}
      />
    </div>
  )
}
