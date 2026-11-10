import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronRight, Plus, Search, Users, X } from 'lucide-react'
import { run, supabase } from '../lib/supabase'
import { useLoad } from '../lib/hooks'
import { fmtData, fmtDataHora, fmtMoeda, normalizar, soDigitos } from '../lib/format'
import { Cabecalho } from '../components/Layout'
import { Avatar, Badge, Chips, ErroCarregar, Spinner, Vazio } from '../components/ui'
import { ClienteForm } from '../components/Forms'

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendencia', label: 'Com pagamento pendente' },
  { id: 'agendadas', label: 'Com sessão marcada' },
  { id: 'sumidas', label: 'Sem vir há 60+ dias' },
]

export default function Clientes() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [novo, setNovo] = useState(false)
  const { data, loading, error, reload } = useLoad(() => run(supabase.from('v_clientes').select('*').order('nome')))

  const lista = useMemo(() => {
    if (!data) return []
    const t = normalizar(busca)
    const dig = soDigitos(busca)
    const limite = Date.now() - 60 * 86400000
    return data.filter((c) => {
      if (t && !normalizar(c.nome).includes(t) && !(dig.length >= 3 && soDigitos(c.telefone).includes(dig))) return false
      if (filtro === 'pendencia') return Number(c.saldo_devedor) > 0
      if (filtro === 'agendadas') return !!c.proxima_sessao
      if (filtro === 'sumidas') return !c.proxima_sessao && c.ultima_visita && new Date(c.ultima_visita) < limite
      return true
    })
  }, [data, busca, filtro])

  return (
    <div className="pagina">
      <Cabecalho titulo="Clientes" subtitulo={data ? `${data.length} cadastradas` : ' '}>
        <button className="btn btn-primario" onClick={() => setNovo(true)}>
          <Plus size={17} /> Nova cliente
        </button>
      </Cabecalho>

      <div className="busca">
        <Search size={18} />
        <input
          type="search"
          placeholder="Pesquisar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoComplete="off"
        />
        {busca && (
          <button className="btn-icone" onClick={() => setBusca('')} aria-label="Limpar pesquisa">
            <X size={16} />
          </button>
        )}
      </div>
      <Chips opcoes={FILTROS} valor={filtro} onMudar={setFiltro} />

      {error && <ErroCarregar erro={error} onTentar={reload} />}

      {loading && !data ? (
        <Spinner texto="Carregando clientes…" />
      ) : lista.length === 0 ? (
        <Vazio
          icone={Users}
          titulo={busca ? `Nenhuma cliente encontrada para “${busca}”` : 'Nenhuma cliente aqui'}
          texto={data?.length ? 'Tente outro nome ou outro filtro.' : 'Cadastre a primeira cliente para começar.'}
        >
          {!data?.length && (
            <button className="btn btn-primario btn-sm" onClick={() => setNovo(true)}>
              <Plus size={16} /> Nova cliente
            </button>
          )}
        </Vazio>
      ) : (
        <div className="cartao lista-clientes">
          {lista.map((c) => (
            <button key={c.id} className="cliente-linha" onClick={() => navigate(`/clientes/${c.id}`)}>
              <Avatar nome={c.nome} />
              <div className="cliente-linha-info">
                <strong>{c.nome}</strong>
                <span className="muted">
                  {c.telefone || 'Sem telefone'}
                  {c.ultima_visita && <> · última visita {fmtData(c.ultima_visita)}</>}
                </span>
              </div>
              <div className="cliente-linha-extra">
                {c.proxima_sessao && (
                  <span className="proxima">
                    <CalendarClock size={14} /> {fmtDataHora(c.proxima_sessao)}
                  </span>
                )}
                {Number(c.saldo_devedor) > 0 && <Badge tom="danger">Deve {fmtMoeda(c.saldo_devedor)}</Badge>}
              </div>
              <ChevronRight size={18} className="seta" />
            </button>
          ))}
        </div>
      )}

      <ClienteForm aberto={novo} onFechar={() => setNovo(false)} onSalvo={(c) => navigate(`/clientes/${c.id}`)} />
    </div>
  )
}
