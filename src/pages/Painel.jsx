import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarDays, CircleDollarSign, Plus, TrendingUp, UserPlus } from 'lucide-react'
import { run, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { addDias, diaLocal, fmtMoeda, inicioDoDia } from '../lib/format'
import { Cabecalho } from '../components/Layout'
import { ErroCarregar, Spinner, Stat, Vazio } from '../components/ui'
import { AtendimentoForm, ClienteForm, PagamentoForm } from '../components/Forms'
import SessaoItem from '../components/SessaoItem'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Painel() {
  const { membro } = useAuth()
  const [modal, setModal] = useState(null)

  const { data, loading, error, reload } = useLoad(async () => {
    const hoje = inicioDoDia(new Date())
    const amanha = addDias(hoje, 1)
    const em7 = addDias(hoje, 7)
    const inicioMes = diaLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    const [doDia, semana, pendSessoes, pendPacotes, pagMes] = await Promise.all([
      run(
        supabase
          .from('v_atendimentos')
          .select('*')
          .gte('data_hora', hoje.toISOString())
          .lt('data_hora', amanha.toISOString())
          .order('data_hora')
      ),
      run(
        supabase
          .from('atendimentos')
          .select('id', { count: 'exact', head: false })
          .eq('status', 'agendado')
          .gte('data_hora', amanha.toISOString())
          .lt('data_hora', em7.toISOString())
      ),
      run(supabase.from('v_atendimentos').select('saldo').gt('saldo', 0).neq('status', 'cancelado')),
      run(supabase.from('v_pacotes').select('saldo').gt('saldo', 0)),
      run(supabase.from('pagamentos').select('valor').gte('data', inicioMes)),
    ])
    const soma = (l, k) => l.reduce((s, x) => s + Number(x[k] || 0), 0)
    return {
      doDia,
      proximos: semana.length,
      aReceber: soma(pendSessoes, 'saldo') + soma(pendPacotes, 'saldo'),
      qtdPendentes: pendSessoes.length + pendPacotes.length,
      recebidoMes: soma(pagMes, 'valor'),
    }
  })

  const hojeTxt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const primeiroNome = membro?.nome?.split(' ')[0]

  return (
    <div className="pagina">
      <Cabecalho titulo={`${saudacao()}${primeiroNome ? ', ' + primeiroNome : ''}`} subtitulo={hojeTxt.charAt(0).toUpperCase() + hojeTxt.slice(1)}>
        <button className="btn" onClick={() => setModal({ tipo: 'cliente' })}>
          <UserPlus size={17} /> <span className="so-desktop">Nova cliente</span>
        </button>
        <button className="btn btn-primario" onClick={() => setModal({ tipo: 'sessao' })}>
          <Plus size={17} /> Agendar
        </button>
      </Cabecalho>

      {error && <ErroCarregar erro={error} onTentar={reload} />}

      <div className="stats">
        <Stat rotulo="Sessões hoje" valor={data ? data.doDia.filter((a) => a.status !== 'cancelado').length : '—'} icone={CalendarCheck} tom="rose" />
        <Stat rotulo="Próximos 7 dias" valor={data?.proximos ?? '—'} detalhe="sessões agendadas" icone={CalendarDays} tom="lilac" />
        <Stat
          rotulo="A receber"
          valor={data ? fmtMoeda(data.aReceber) : '—'}
          detalhe={data ? `${data.qtdPendentes} em aberto` : ''}
          icone={CircleDollarSign}
          tom="sand"
        />
        <Stat rotulo="Recebido no mês" valor={data ? fmtMoeda(data.recebidoMes) : '—'} icone={TrendingUp} tom="sage" />
      </div>

      <section className="cartao">
        <div className="cartao-cabeca">
          <h2>Agenda de hoje</h2>
          <Link to="/agenda" className="link">
            Ver agenda completa
          </Link>
        </div>
        {loading && !data ? (
          <Spinner />
        ) : data?.doDia.length ? (
          <div className="lista-sessoes">
            {data.doDia.map((a) => (
              <SessaoItem
                key={a.id}
                a={a}
                onMudou={reload}
                onEditar={(x) => setModal({ tipo: 'sessao', dados: x })}
                onPagar={(x) => setModal({ tipo: 'pagamento', dados: x })}
              />
            ))}
          </div>
        ) : (
          <Vazio icone={CalendarDays} titulo="Nenhuma sessão hoje" texto="Aproveite para organizar a agenda da semana.">
            <button className="btn btn-primario btn-sm" onClick={() => setModal({ tipo: 'sessao' })}>
              <Plus size={16} /> Agendar sessão
            </button>
          </Vazio>
        )}
      </section>

      <ClienteForm aberto={modal?.tipo === 'cliente'} onFechar={() => setModal(null)} onSalvo={reload} />
      <AtendimentoForm
        aberto={modal?.tipo === 'sessao'}
        inicial={modal?.dados}
        onFechar={() => setModal(null)}
        onSalvo={reload}
      />
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
