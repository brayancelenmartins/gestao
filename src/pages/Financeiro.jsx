import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleDollarSign, Download, Package, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { run, supabase } from '../lib/supabase'
import { useLoad } from '../lib/hooks'
import { diaLocal, fmtDataHora, fmtDia, fmtMoeda, FORMAS, STATUS_PAG } from '../lib/format'
import { Cabecalho } from '../components/Layout'
import { Abas, Avatar, Badge, ErroCarregar, Spinner, Stat, Vazio } from '../components/ui'
import { PagamentoForm } from '../components/Forms'

function mesAtual() {
  return diaLocal().slice(0, 7)
}

function baixarCSV(nome, linhas) {
  const csv = linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export default function Financeiro() {
  const [mes, setMes] = useState(mesAtual())
  const [aba, setAba] = useState('receber')
  const [modal, setModal] = useState(null)

  const { data, loading, error, reload } = useLoad(async () => {
    const [a, m] = mes.split('-').map(Number)
    const ini = `${mes}-01`
    const fim = diaLocal(new Date(a, m, 1)) // 1º dia do mês seguinte
    const [pagamentos, sessoes, pacotes] = await Promise.all([
      run(
        supabase
          .from('pagamentos')
          .select('*, clientes(nome), pacotes(descricao), atendimentos(data_hora, tratamentos(nome))')
          .gte('data', ini)
          .lt('data', fim)
          .order('data', { ascending: false })
      ),
      run(supabase.from('v_atendimentos').select('*').gt('saldo', 0).neq('status', 'cancelado').order('data_hora')),
      run(supabase.from('v_pacotes').select('*').gt('saldo', 0).order('data_compra')),
    ])
    const pendencias = [
      ...pacotes.map((p) => ({
        chave: `p${p.id}`, tipo: 'pacote', id: p.id, cliente_id: p.cliente_id, cliente_nome: p.cliente_nome,
        descricao: `Pacote: ${p.descricao}`, data: fmtDia(p.data_compra), valor: p.valor_total, pago: p.valor_pago,
        saldo: p.saldo, status: p.status_pagamento,
      })),
      ...sessoes.map((s) => ({
        chave: `a${s.id}`, tipo: 'atendimento', id: s.id, cliente_id: s.cliente_id, cliente_nome: s.cliente_nome,
        descricao: s.tratamento_nome || 'Sessão', data: fmtDataHora(s.data_hora), valor: s.valor, pago: s.valor_pago,
        saldo: s.saldo, status: s.status_pagamento,
      })),
    ].sort((x, y) => x.cliente_nome.localeCompare(y.cliente_nome, 'pt-BR'))
    return { pagamentos, pendencias }
  }, [mes])

  const resumo = useMemo(() => {
    if (!data) return null
    const recebido = data.pagamentos.reduce((s, p) => s + Number(p.valor), 0)
    const aReceber = data.pendencias.reduce((s, p) => s + Number(p.saldo), 0)
    const porForma = {}
    for (const p of data.pagamentos) porForma[p.forma] = (porForma[p.forma] || 0) + Number(p.valor)
    return { recebido, aReceber, porForma, ticket: data.pagamentos.length ? recebido / data.pagamentos.length : 0 }
  }, [data])

  const nomeMes = new Date(mes + '-01T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function exportar() {
    baixarCSV(`pagamentos-${mes}.csv`, [
      ['Data', 'Cliente', 'Referente a', 'Forma', 'Valor'],
      ...data.pagamentos.map((p) => [
        fmtDia(p.data),
        p.clientes?.nome,
        p.pacotes ? `Pacote: ${p.pacotes.descricao}` : p.atendimentos?.tratamentos?.nome || 'Sessão',
        FORMAS[p.forma],
        String(p.valor).replace('.', ','),
      ]),
    ])
  }

  return (
    <div className="pagina">
      <Cabecalho titulo="Financeiro" subtitulo="Pagamentos recebidos e valores em aberto">
        <label className="filtro">
          <span>Mês</span>
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
      </Cabecalho>

      {error && <ErroCarregar erro={error} onTentar={reload} />}

      <div className="stats stats-3">
        <Stat rotulo={`Recebido em ${nomeMes}`} valor={resumo ? fmtMoeda(resumo.recebido) : '—'} detalhe={data ? `${data.pagamentos.length} pagamentos` : ''} icone={TrendingUp} tom="sage" />
        <Stat rotulo="A receber (total)" valor={resumo ? fmtMoeda(resumo.aReceber) : '—'} detalhe={data ? `${data.pendencias.length} em aberto` : ''} icone={CircleDollarSign} tom="sand" />
        <Stat rotulo="Valor médio por pagamento" valor={resumo ? fmtMoeda(resumo.ticket) : '—'} icone={Wallet} tom="lilac" />
      </div>

      {resumo && Object.keys(resumo.porForma).length > 0 && (
        <section className="cartao">
          <div className="cartao-cabeca"><h2>Por forma de pagamento</h2></div>
          <div className="formas">
            {Object.entries(resumo.porForma)
              .sort((a, b) => b[1] - a[1])
              .map(([forma, valor]) => (
                <div key={forma} className="forma">
                  <div className="forma-txt">
                    <span>{FORMAS[forma]}</span>
                    <strong>{fmtMoeda(valor)}</strong>
                  </div>
                  <div className="progresso"><div className="progresso-barra" style={{ width: `${(valor / resumo.recebido) * 100}%` }} /></div>
                </div>
              ))}
          </div>
        </section>
      )}

      <Abas
        ativa={aba}
        onMudar={setAba}
        abas={[
          { id: 'receber', label: 'A receber', contador: data?.pendencias.length },
          { id: 'recebidos', label: 'Recebidos no mês', contador: data?.pagamentos.length },
        ]}
      />

      {loading && !data ? (
        <Spinner />
      ) : aba === 'receber' ? (
        data?.pendencias.length ? (
          <section className="cartao">
            <div className="lista-pagamentos">
              {data.pendencias.map((p) => (
                <div key={p.chave} className="pagamento">
                  <Avatar nome={p.cliente_nome} tamanho="sm" />
                  <div className="pagamento-info">
                    <Link to={`/clientes/${p.cliente_id}`} className="link-forte">{p.cliente_nome}</Link>
                    <span className="muted">
                      {p.tipo === 'pacote' && <Package size={13} className="inline-icone" />} {p.descricao} · {p.data}
                    </span>
                  </div>
                  <div className="pagamento-meta">
                    <strong className="texto-perigo">{fmtMoeda(p.saldo)}</strong>
                    <Badge tom={STATUS_PAG[p.status].tom}>
                      {p.status === 'parcial' ? `Pagou ${fmtMoeda(p.pago)} de ${fmtMoeda(p.valor)}` : STATUS_PAG[p.status].label}
                    </Badge>
                  </div>
                  <button className="btn btn-sm" onClick={() => setModal(p)}>
                    <CircleDollarSign size={15} /> <span className="so-desktop">Receber</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <Vazio icone={CircleDollarSign} titulo="Tudo em dia!" texto="Nenhum valor em aberto no momento." />
        )
      ) : data?.pagamentos.length ? (
        <section className="cartao">
          <div className="cartao-cabeca">
            <h2>Pagamentos de {nomeMes}</h2>
            <button className="btn btn-sm" onClick={exportar}>
              <Download size={15} /> Exportar planilha
            </button>
          </div>
          <div className="lista-pagamentos">
            {data.pagamentos.map((p) => (
              <div key={p.id} className="pagamento">
                <span className="pagamento-icone"><Receipt size={17} /></span>
                <div className="pagamento-info">
                  <Link to={`/clientes/${p.cliente_id}`} className="link-forte">{p.clientes?.nome}</Link>
                  <span className="muted">
                    {p.pacotes ? `Pacote: ${p.pacotes.descricao}` : p.atendimentos?.tratamentos?.nome || 'Sessão'}
                  </span>
                </div>
                <div className="pagamento-meta">
                  <strong>{fmtMoeda(p.valor)}</strong>
                  <span className="muted pequeno">{fmtDia(p.data)} · {FORMAS[p.forma]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <Vazio icone={Receipt} titulo={`Nenhum pagamento em ${nomeMes}`} />
      )}

      <PagamentoForm
        aberto={!!modal}
        clienteId={modal?.cliente_id}
        alvo={modal ? { tipo: modal.tipo, id: modal.id, saldo: modal.saldo } : null}
        onFechar={() => setModal(null)}
        onSalvo={reload}
      />
    </div>
  )
}
