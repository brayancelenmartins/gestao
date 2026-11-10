import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Cake, CalendarPlus, CircleDollarSign, Mail, MessageCircle, MoreVertical,
  Package, PackagePlus, Pencil, Phone, Receipt, StickyNote, Trash2,
} from 'lucide-react'
import { mensagemErro, run, supabase } from '../lib/supabase'
import { useLoad } from '../lib/hooks'
import { fmtDataHora, fmtDia, fmtMoeda, FORMAS, inicioDoDia, linkWhatsApp, STATUS_PAG } from '../lib/format'
import {
  Abas, Avatar, Badge, ErroCarregar, Menu, Progresso, Spinner, Stat, Vazio, useConfirmar, useToast,
} from '../components/ui'
import { AtendimentoForm, ClienteForm, PacoteForm, PagamentoForm } from '../components/Forms'
import SessaoItem from '../components/SessaoItem'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const clienteId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const confirmar = useConfirmar()
  const [aba, setAba] = useState('sessoes')
  const [modal, setModal] = useState(null)
  const fechar = () => setModal(null)

  const { data, loading, error, reload } = useLoad(async () => {
    const [cliente, sessoes, pacotes, pagamentos] = await Promise.all([
      run(supabase.from('v_clientes').select('*').eq('id', clienteId).maybeSingle()),
      run(supabase.from('v_atendimentos').select('*').eq('cliente_id', clienteId).order('data_hora', { ascending: false })),
      run(supabase.from('v_pacotes').select('*').eq('cliente_id', clienteId).order('data_compra', { ascending: false })),
      run(
        supabase
          .from('pagamentos')
          .select('*, atendimentos(data_hora, tratamentos(nome)), pacotes(descricao)')
          .eq('cliente_id', clienteId)
          .order('data', { ascending: false })
          .order('id', { ascending: false })
      ),
    ])
    return { cliente, sessoes, pacotes, pagamentos }
  }, [clienteId])

  if (loading && !data) return <div className="pagina"><Spinner texto="Carregando…" /></div>
  if (error && !data) return <div className="pagina"><ErroCarregar erro={error} onTentar={reload} /></div>
  if (!data?.cliente)
    return (
      <div className="pagina">
        <Vazio titulo="Cliente não encontrada">
          <Link to="/clientes" className="btn btn-sm">Voltar para clientes</Link>
        </Vazio>
      </div>
    )

  const { cliente: c, sessoes, pacotes, pagamentos } = data
  const agora = inicioDoDia(new Date()) // sessões de hoje continuam em “próximas”
  const proximas = sessoes.filter((s) => s.status === 'agendado' && new Date(s.data_hora) >= agora).reverse()
  const historico = sessoes.filter((s) => !(s.status === 'agendado' && new Date(s.data_hora) >= agora))
  const realizadas = sessoes.filter((s) => s.status === 'realizado').length
  const totalPago = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
  const wa = linkWhatsApp(c.telefone)

  async function excluirCliente() {
    const ok = await confirmar({
      titulo: 'Excluir cliente?',
      texto: `Todos os dados de ${c.nome} (sessões, pacotes e pagamentos) serão apagados permanentemente.`,
      botao: 'Excluir tudo',
      perigo: true,
    })
    if (!ok) return
    try {
      await run(supabase.from('clientes').delete().eq('id', c.id))
      toast('Cliente excluída')
      navigate('/clientes')
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  async function excluir(tabela, registro, texto) {
    const ok = await confirmar({ titulo: 'Confirmar exclusão', texto, botao: 'Excluir', perigo: true })
    if (!ok) return
    try {
      await run(supabase.from(tabela).delete().eq('id', registro.id))
      toast('Excluído')
      reload()
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  const acoesSessao = {
    onMudou: reload,
    onEditar: (x) => setModal({ tipo: 'sessao', dados: x }),
    onPagar: (x) => setModal({ tipo: 'pagamento', alvo: { tipo: 'atendimento', id: x.id, saldo: x.saldo } }),
  }

  return (
    <div className="pagina">
      <button className="voltar" onClick={() => navigate(-1)}>
        <ArrowLeft size={17} /> Voltar
      </button>

      <section className="cartao perfil">
        <div className="perfil-topo">
          <Avatar nome={c.nome} tamanho="lg" />
          <div className="perfil-nome">
            <h1>{c.nome}</h1>
            <span className="muted">Cliente desde {fmtDia(c.created_at)}</span>
          </div>
          <div className="perfil-acoes">
            <button className="btn btn-sm" onClick={() => setModal({ tipo: 'cliente' })}>
              <Pencil size={15} /> <span className="so-desktop">Editar</span>
            </button>
            <Menu
              icone={<MoreVertical size={18} />}
              itens={[{ label: 'Excluir cliente', icone: Trash2, perigo: true, onClick: excluirCliente }]}
            />
          </div>
        </div>
        <div className="perfil-dados">
          {c.telefone && (
            <span className="dado">
              <Phone size={15} /> <a href={`tel:${c.telefone}`}>{c.telefone}</a>
              {wa && (
                <a className="wa" href={wa} target="_blank" rel="noreferrer" title="Abrir no WhatsApp">
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
            </span>
          )}
          {c.email && (
            <span className="dado">
              <Mail size={15} /> <a href={`mailto:${c.email}`}>{c.email}</a>
            </span>
          )}
          {c.data_nascimento && (
            <span className="dado">
              <Cake size={15} /> {fmtDia(c.data_nascimento)}
            </span>
          )}
        </div>
        {c.observacoes && (
          <div className="perfil-obs">
            <StickyNote size={15} />
            <p>{c.observacoes}</p>
          </div>
        )}
      </section>

      <div className="stats">
        <Stat rotulo="Saldo devedor" valor={fmtMoeda(c.saldo_devedor)} tom={Number(c.saldo_devedor) > 0 ? 'danger' : 'sage'} />
        <Stat rotulo="Total pago" valor={fmtMoeda(totalPago)} tom="sage" />
        <Stat rotulo="Sessões realizadas" valor={realizadas} tom="lilac" />
        <Stat rotulo="Próxima sessão" valor={c.proxima_sessao ? fmtDataHora(c.proxima_sessao) : '—'} tom="rose" />
      </div>

      <div className="barra-acoes">
        <button className="btn btn-primario" onClick={() => setModal({ tipo: 'sessao' })}>
          <CalendarPlus size={17} /> Nova sessão
        </button>
        <button className="btn" onClick={() => setModal({ tipo: 'pacote' })}>
          <PackagePlus size={17} /> Novo pacote
        </button>
        <button className="btn" onClick={() => setModal({ tipo: 'pagamento' })} disabled={Number(c.saldo_devedor) <= 0}>
          <CircleDollarSign size={17} /> Registrar pagamento
        </button>
      </div>

      <Abas
        ativa={aba}
        onMudar={setAba}
        abas={[
          { id: 'sessoes', label: 'Sessões', contador: sessoes.length },
          { id: 'pacotes', label: 'Pacotes', contador: pacotes.length },
          { id: 'pagamentos', label: 'Pagamentos', contador: pagamentos.length },
        ]}
      />

      {aba === 'sessoes' && (
        <>
          <section className="cartao">
            <div className="cartao-cabeca"><h2>Próximas sessões</h2></div>
            {proximas.length ? (
              <div className="lista-sessoes">
                {proximas.map((s) => <SessaoItem key={s.id} a={s} mostrarCliente={false} mostrarData {...acoesSessao} />)}
              </div>
            ) : (
              <p className="muted vazio-linha">Nenhuma sessão marcada.</p>
            )}
          </section>
          <section className="cartao">
            <div className="cartao-cabeca"><h2>Histórico</h2></div>
            {historico.length ? (
              <div className="lista-sessoes">
                {historico.map((s) => <SessaoItem key={s.id} a={s} mostrarCliente={false} mostrarData {...acoesSessao} />)}
              </div>
            ) : (
              <p className="muted vazio-linha">Ainda não há sessões no histórico.</p>
            )}
          </section>
        </>
      )}

      {aba === 'pacotes' &&
        (pacotes.length ? (
          <div className="grade-pacotes">
            {pacotes.map((p) => {
              const pg = STATUS_PAG[p.status_pagamento]
              return (
                <div key={p.id} className="cartao pacote">
                  <div className="pacote-topo">
                    <span className="pacote-icone"><Package size={18} /></span>
                    <div>
                      <strong>{p.descricao}</strong>
                      <span className="muted">Comprado em {fmtDia(p.data_compra)}</span>
                    </div>
                    <Menu
                      icone={<MoreVertical size={18} />}
                      itens={[
                        p.sessoes_restantes > 0 && {
                          label: 'Agendar sessão do pacote',
                          icone: CalendarPlus,
                          onClick: () => setModal({ tipo: 'sessao', pacoteId: p.id }),
                        },
                        p.saldo > 0 && {
                          label: 'Registrar pagamento',
                          icone: CircleDollarSign,
                          onClick: () => setModal({ tipo: 'pagamento', alvo: { tipo: 'pacote', id: p.id, saldo: p.saldo } }),
                        },
                        { label: 'Editar', icone: Pencil, onClick: () => setModal({ tipo: 'pacote', dados: p }) },
                        {
                          label: 'Excluir',
                          icone: Trash2,
                          perigo: true,
                          onClick: () =>
                            excluir('pacotes', p, 'O pacote e os pagamentos dele serão apagados. As sessões continuam no histórico como avulsas.'),
                        },
                      ]}
                    />
                  </div>
                  <div className="pacote-progresso">
                    <div className="pacote-progresso-txt">
                      <span><strong>{p.sessoes_realizadas}</strong> de {p.total_sessoes} sessões feitas</span>
                      <span className="muted">
                        {p.sessoes_restantes} restante{p.sessoes_restantes === 1 ? '' : 's'}
                        {p.sessoes_agendadas > 0 && ` · ${p.sessoes_agendadas} agendada${p.sessoes_agendadas === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <Progresso atual={p.sessoes_realizadas} total={p.total_sessoes} />
                  </div>
                  <div className="pacote-valores">
                    <div><span className="muted">Valor</span><strong>{fmtMoeda(p.valor_total)}</strong></div>
                    <div><span className="muted">Pago</span><strong>{fmtMoeda(p.valor_pago)}</strong></div>
                    <div><span className="muted">Falta</span><strong className={p.saldo > 0 ? 'texto-perigo' : ''}>{fmtMoeda(p.saldo)}</strong></div>
                  </div>
                  <div className="pacote-rodape">
                    <Badge tom={pg.tom}>{pg.label}</Badge>
                    {p.sessoes_restantes > 0 && (
                      <button className="btn btn-sm" onClick={() => setModal({ tipo: 'sessao', pacoteId: p.id })}>
                        <CalendarPlus size={15} /> Agendar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Vazio icone={Package} titulo="Nenhum pacote" texto="Venda pacotes de sessões e acompanhe quantas já foram usadas.">
            <button className="btn btn-primario btn-sm" onClick={() => setModal({ tipo: 'pacote' })}>
              <PackagePlus size={16} /> Novo pacote
            </button>
          </Vazio>
        ))}

      {aba === 'pagamentos' &&
        (pagamentos.length ? (
          <section className="cartao">
            <div className="lista-pagamentos">
              {pagamentos.map((p) => (
                <div key={p.id} className="pagamento">
                  <span className="pagamento-icone"><Receipt size={17} /></span>
                  <div className="pagamento-info">
                    <strong>{fmtMoeda(p.valor)}</strong>
                    <span className="muted">
                      {p.pacotes
                        ? `Pacote: ${p.pacotes.descricao}`
                        : p.atendimentos
                          ? `Sessão ${fmtDataHora(p.atendimentos.data_hora)}${p.atendimentos.tratamentos ? ' · ' + p.atendimentos.tratamentos.nome : ''}`
                          : '—'}
                    </span>
                    {p.observacoes && <span className="muted pequeno">{p.observacoes}</span>}
                  </div>
                  <div className="pagamento-meta">
                    <span>{fmtDia(p.data)}</span>
                    <Badge tom="muted">{FORMAS[p.forma]}</Badge>
                  </div>
                  <Menu
                    icone={<MoreVertical size={18} />}
                    itens={[
                      { label: 'Editar', icone: Pencil, onClick: () => setModal({ tipo: 'pagamento', dados: p }) },
                      { label: 'Excluir', icone: Trash2, perigo: true, onClick: () => excluir('pagamentos', p, `Excluir o pagamento de ${fmtMoeda(p.valor)}?`) },
                    ]}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <Vazio icone={Receipt} titulo="Nenhum pagamento registrado" />
        ))}

      <ClienteForm aberto={modal?.tipo === 'cliente'} inicial={c} onFechar={fechar} onSalvo={reload} />
      <AtendimentoForm
        aberto={modal?.tipo === 'sessao'}
        inicial={modal?.dados}
        clienteId={clienteId}
        pacoteId={modal?.pacoteId}
        onFechar={fechar}
        onSalvo={reload}
      />
      <PacoteForm aberto={modal?.tipo === 'pacote'} inicial={modal?.dados} clienteId={clienteId} onFechar={fechar} onSalvo={reload} />
      <PagamentoForm
        aberto={modal?.tipo === 'pagamento'}
        clienteId={clienteId}
        alvo={modal?.alvo}
        inicial={modal?.dados}
        onFechar={fechar}
        onSalvo={reload}
      />
    </div>
  )
}
