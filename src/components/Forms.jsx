import { useEffect, useState } from 'react'
import { run, supabase, mensagemErro } from '../lib/supabase'
import { diaLocal, fmtDataHora, fmtMoeda, FORMAS, STATUS, toInputDataHora } from '../lib/format'
import { Campo, InputMoeda, Modal, useToast } from './ui'
import ClientePicker from './ClientePicker'

const num = (v) => (v === '' || v == null ? 0 : Number(v))
const vazioParaNull = (v) => (v === '' ? null : v)

function Rodape({ onFechar, salvando, form, texto = 'Salvar' }) {
  return (
    <>
      <button type="button" className="btn" onClick={onFechar}>
        Cancelar
      </button>
      <button type="submit" form={form} className="btn btn-primario" disabled={salvando}>
        {salvando ? 'Salvando…' : texto}
      </button>
    </>
  )
}

function Erro({ erro }) {
  if (!erro) return null
  return <div className="alerta alerta-danger form-erro">{erro}</div>
}

function useTratamentos(aberto, incluirId) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    if (!aberto) return
    run(supabase.from('tratamentos').select('*').order('nome'))
      .then((t) => setLista(t.filter((x) => x.ativo || x.id === incluirId)))
      .catch(() => setLista([]))
  }, [aberto, incluirId])
  return lista
}

/* =========================== Cliente =========================== */
export function ClienteForm({ aberto, onFechar, onSalvo, inicial }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setF({
      nome: inicial?.nome || '',
      telefone: inicial?.telefone || '',
      email: inicial?.email || '',
      data_nascimento: inicial?.data_nascimento || '',
      observacoes: inicial?.observacoes || '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inicial?.id])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return setErro('Informe o nome da cliente.')
    setSalvando(true)
    setErro('')
    const dados = {
      nome: f.nome.trim(),
      telefone: vazioParaNull(f.telefone.trim()),
      email: vazioParaNull(f.email.trim()),
      data_nascimento: vazioParaNull(f.data_nascimento),
      observacoes: vazioParaNull(f.observacoes.trim()),
    }
    try {
      const salvo = inicial?.id
        ? await run(supabase.from('clientes').update(dados).eq('id', inicial.id).select().single())
        : await run(supabase.from('clientes').insert(dados).select().single())
      toast(inicial?.id ? 'Cliente atualizada' : 'Cliente cadastrada')
      onSalvo?.(salvo)
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial?.id ? 'Editar cliente' : 'Nova cliente'}
      rodape={<Rodape onFechar={onFechar} salvando={salvando} form="form-cliente" />}
    >
      <form id="form-cliente" className="form" onSubmit={salvar}>
        <Erro erro={erro} />
        <Campo rotulo="Nome completo" obrigatorio>
          <input value={f.nome || ''} onChange={set('nome')} autoFocus />
        </Campo>
        <div className="grade-2">
          <Campo rotulo="Telefone / WhatsApp">
            <input value={f.telefone || ''} onChange={set('telefone')} inputMode="tel" placeholder="(11) 99999-0000" />
          </Campo>
          <Campo rotulo="Data de nascimento">
            <input type="date" value={f.data_nascimento || ''} onChange={set('data_nascimento')} />
          </Campo>
        </div>
        <Campo rotulo="E-mail">
          <input type="email" value={f.email || ''} onChange={set('email')} />
        </Campo>
        <Campo rotulo="Observações" dica="Alergias, contraindicações, preferências…">
          <textarea rows={3} value={f.observacoes || ''} onChange={set('observacoes')} />
        </Campo>
      </form>
    </Modal>
  )
}

/* ========================= Atendimento ========================= */
export function AtendimentoForm({ aberto, onFechar, onSalvo, inicial, clienteId, pacoteId, dataPadrao }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [pacotes, setPacotes] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const tratamentos = useTratamentos(aberto, inicial?.tratamento_id)
  const editando = !!inicial?.id

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setF({
      cliente_id: inicial?.cliente_id || clienteId || null,
      tratamento_id: inicial?.tratamento_id || '',
      pacote_id: inicial?.pacote_id || pacoteId || '',
      data_hora: toInputDataHora(inicial?.data_hora || dataPadrao),
      status: inicial?.status || 'agendado',
      valor: inicial?.valor ?? '',
      observacoes: inicial?.observacoes || '',
      pago_agora: '',
      forma: 'pix',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inicial?.id, clienteId, pacoteId, dataPadrao])

  // pacotes da cliente escolhida
  useEffect(() => {
    if (!aberto || !f.cliente_id) {
      setPacotes([])
      return
    }
    run(supabase.from('v_pacotes').select('*').eq('cliente_id', f.cliente_id).order('data_compra', { ascending: false }))
      .then((lista) => {
        setPacotes(lista)
        // ao abrir já com um pacote escolhido, preenche o tratamento
        if (pacoteId && !inicial?.id) {
          const p = lista.find((x) => x.id === pacoteId)
          if (p) setF((x) => ({ ...x, tratamento_id: p.tratamento_id || x.tratamento_id, valor: 0 }))
        }
      })
      .catch(() => setPacotes([]))
  }, [aberto, f.cliente_id, pacoteId, inicial?.id])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  function mudarTratamento(e) {
    const id = e.target.value ? Number(e.target.value) : ''
    const t = tratamentos.find((x) => x.id === id)
    setF((x) => ({ ...x, tratamento_id: id, valor: x.pacote_id ? 0 : t ? t.preco_padrao : x.valor }))
  }

  function mudarPacote(e) {
    const id = e.target.value ? Number(e.target.value) : ''
    const p = pacotes.find((x) => x.id === id)
    setF((x) => {
      if (p) return { ...x, pacote_id: id, tratamento_id: p.tratamento_id || x.tratamento_id, valor: 0 }
      const t = tratamentos.find((tt) => tt.id === x.tratamento_id)
      return { ...x, pacote_id: '', valor: t ? t.preco_padrao : x.valor }
    })
  }

  const pacotesVisiveis = pacotes.filter((p) => p.sessoes_restantes > 0 || p.id === f.pacote_id)

  async function salvar(e) {
    e.preventDefault()
    if (!f.cliente_id) return setErro('Escolha a cliente.')
    if (!f.data_hora) return setErro('Informe a data e a hora.')
    const valor = num(f.valor)
    const pagoAgora = num(f.pago_agora)
    if (pagoAgora > valor) return setErro('O valor pago agora não pode ser maior que o valor da sessão.')
    setSalvando(true)
    setErro('')
    const dados = {
      cliente_id: f.cliente_id,
      tratamento_id: f.tratamento_id || null,
      pacote_id: f.pacote_id || null,
      data_hora: new Date(f.data_hora).toISOString(),
      status: f.status,
      valor,
      observacoes: vazioParaNull(f.observacoes.trim()),
    }
    try {
      const salvo = editando
        ? await run(supabase.from('atendimentos').update(dados).eq('id', inicial.id).select().single())
        : await run(supabase.from('atendimentos').insert(dados).select().single())
      if (!editando && pagoAgora > 0) {
        await run(
          supabase.from('pagamentos').insert({
            cliente_id: f.cliente_id,
            atendimento_id: salvo.id,
            valor: pagoAgora,
            forma: f.forma,
            data: diaLocal(),
          })
        )
      }
      toast(editando ? 'Sessão atualizada' : 'Sessão registrada')
      onSalvo?.(salvo)
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar sessão' : 'Nova sessão'}
      rodape={<Rodape onFechar={onFechar} salvando={salvando} form="form-atendimento" />}
    >
      <form id="form-atendimento" className="form" onSubmit={salvar}>
        <Erro erro={erro} />
        {!clienteId && !editando && (
          <Campo rotulo="Cliente" obrigatorio>
            <ClientePicker valor={f.cliente_id} onEscolher={(id) => setF((x) => ({ ...x, cliente_id: id, pacote_id: '' }))} />
          </Campo>
        )}
        <div className="grade-2">
          <Campo rotulo="Data e hora" obrigatorio>
            <input type="datetime-local" value={f.data_hora || ''} onChange={set('data_hora')} />
          </Campo>
          <Campo rotulo="Situação">
            <select value={f.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {pacotesVisiveis.length > 0 && (
          <Campo rotulo="Faz parte de um pacote?" dica="Sessões de pacote não são cobradas separadamente.">
            <select value={f.pacote_id || ''} onChange={mudarPacote}>
              <option value="">Não — sessão avulsa</option>
              {pacotesVisiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descricao} ({p.sessoes_realizadas}/{p.total_sessoes} feitas)
                </option>
              ))}
            </select>
          </Campo>
        )}
        <div className="grade-2">
          <Campo rotulo="Tratamento">
            <select value={f.tratamento_id || ''} onChange={mudarTratamento}>
              <option value="">— Selecione —</option>
              {tratamentos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Valor da sessão">
            <InputMoeda value={f.valor} onChange={(v) => setF((x) => ({ ...x, valor: v }))} disabled={!!f.pacote_id} />
          </Campo>
        </div>
        {!editando && !f.pacote_id && num(f.valor) > 0 && (
          <div className="caixa-suave">
            <div className="grade-2">
              <Campo rotulo="Já pagou quanto?" dica="Deixe vazio se ainda não pagou. Aceita valor parcial.">
                <InputMoeda value={f.pago_agora} onChange={(v) => setF((x) => ({ ...x, pago_agora: v }))} placeholder="0,00" />
              </Campo>
              <Campo rotulo="Forma de pagamento">
                <select value={f.forma} onChange={set('forma')}>
                  {Object.entries(FORMAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>
        )}
        <Campo rotulo="Observações">
          <textarea rows={2} value={f.observacoes || ''} onChange={set('observacoes')} />
        </Campo>
      </form>
    </Modal>
  )
}

/* =========================== Pacote ============================ */
export function PacoteForm({ aberto, onFechar, onSalvo, inicial, clienteId }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const tratamentos = useTratamentos(aberto, inicial?.tratamento_id)
  const editando = !!inicial?.id

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setF({
      tratamento_id: inicial?.tratamento_id || '',
      descricao: inicial?.descricao || '',
      total_sessoes: inicial?.total_sessoes ?? 5,
      valor_total: inicial?.valor_total ?? '',
      data_compra: inicial?.data_compra || diaLocal(),
      observacoes: inicial?.observacoes || '',
      pago_agora: '',
      forma: 'pix',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inicial?.id])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const tratamento = tratamentos.find((t) => t.id === Number(f.tratamento_id))
  const descricaoAuto = tratamento ? `${tratamento.nome} · ${f.total_sessoes || '?'} sessões` : ''

  async function salvar(e) {
    e.preventDefault()
    const total = parseInt(f.total_sessoes, 10)
    if (!total || total < 1) return setErro('Informe a quantidade de sessões.')
    const descricao = f.descricao.trim() || descricaoAuto
    if (!descricao) return setErro('Escolha um tratamento ou escreva uma descrição.')
    const valorTotal = num(f.valor_total)
    const pagoAgora = num(f.pago_agora)
    if (pagoAgora > valorTotal) return setErro('O valor pago não pode ser maior que o valor do pacote.')
    setSalvando(true)
    setErro('')
    const dados = {
      cliente_id: inicial?.cliente_id || clienteId,
      tratamento_id: f.tratamento_id ? Number(f.tratamento_id) : null,
      descricao,
      total_sessoes: total,
      valor_total: valorTotal,
      data_compra: f.data_compra || diaLocal(),
      observacoes: vazioParaNull(f.observacoes.trim()),
    }
    try {
      const salvo = editando
        ? await run(supabase.from('pacotes').update(dados).eq('id', inicial.id).select().single())
        : await run(supabase.from('pacotes').insert(dados).select().single())
      if (!editando && pagoAgora > 0) {
        await run(
          supabase.from('pagamentos').insert({
            cliente_id: dados.cliente_id,
            pacote_id: salvo.id,
            valor: pagoAgora,
            forma: f.forma,
            data: diaLocal(),
          })
        )
      }
      toast(editando ? 'Pacote atualizado' : 'Pacote criado')
      onSalvo?.(salvo)
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar pacote' : 'Novo pacote de sessões'}
      rodape={<Rodape onFechar={onFechar} salvando={salvando} form="form-pacote" />}
    >
      <form id="form-pacote" className="form" onSubmit={salvar}>
        <Erro erro={erro} />
        <div className="grade-2">
          <Campo rotulo="Tratamento">
            <select value={f.tratamento_id || ''} onChange={set('tratamento_id')}>
              <option value="">— Selecione —</option>
              {tratamentos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Quantidade de sessões" obrigatorio>
            <input type="number" min="1" inputMode="numeric" value={f.total_sessoes ?? ''} onChange={set('total_sessoes')} />
          </Campo>
        </div>
        <Campo rotulo="Descrição" dica={descricaoAuto && !f.descricao ? `Se vazio: “${descricaoAuto}”` : null}>
          <input value={f.descricao || ''} onChange={set('descricao')} placeholder={descricaoAuto || 'Ex.: Pacote verão'} />
        </Campo>
        <div className="grade-2">
          <Campo rotulo="Valor total do pacote">
            <InputMoeda value={f.valor_total} onChange={(v) => setF((x) => ({ ...x, valor_total: v }))} />
          </Campo>
          <Campo rotulo="Data da compra">
            <input type="date" value={f.data_compra || ''} onChange={set('data_compra')} />
          </Campo>
        </div>
        {!editando && num(f.valor_total) > 0 && (
          <div className="caixa-suave">
            <div className="grade-2">
              <Campo rotulo="Já pagou quanto?" dica="Pode ser parcial (entrada).">
                <InputMoeda value={f.pago_agora} onChange={(v) => setF((x) => ({ ...x, pago_agora: v }))} placeholder="0,00" />
              </Campo>
              <Campo rotulo="Forma de pagamento">
                <select value={f.forma} onChange={set('forma')}>
                  {Object.entries(FORMAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>
        )}
        <Campo rotulo="Observações">
          <textarea rows={2} value={f.observacoes || ''} onChange={set('observacoes')} />
        </Campo>
      </form>
    </Modal>
  )
}

/* ========================== Pagamento ========================== */
export function PagamentoForm({ aberto, onFechar, onSalvo, clienteId, alvo, inicial }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [itens, setItens] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const editando = !!inicial?.id

  // itens em aberto da cliente (sessões e pacotes com saldo)
  useEffect(() => {
    if (!aberto || editando) return
    Promise.all([
      run(supabase.from('v_atendimentos').select('*').eq('cliente_id', clienteId).gt('saldo', 0).neq('status', 'cancelado').order('data_hora')),
      run(supabase.from('v_pacotes').select('*').eq('cliente_id', clienteId).gt('saldo', 0).order('data_compra')),
    ])
      .then(([a, p]) => {
        const lista = [
          ...p.map((x) => ({ chave: `p:${x.id}`, label: `Pacote: ${x.descricao}`, saldo: Number(x.saldo) })),
          ...a.map((x) => ({
            chave: `a:${x.id}`,
            label: `Sessão ${fmtDataHora(x.data_hora)}${x.tratamento_nome ? ' · ' + x.tratamento_nome : ''}`,
            saldo: Number(x.saldo),
          })),
        ]
        setItens(lista)
        setF((x) => {
          const chave = x.chave && lista.some((i) => i.chave === x.chave) ? x.chave : lista[0]?.chave || ''
          const item = lista.find((i) => i.chave === chave)
          return { ...x, chave, valor: x.valor || item?.saldo || '' }
        })
      })
      .catch((e) => setErro(mensagemErro(e)))
  }, [aberto, clienteId, editando])

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setF({
      chave: alvo ? `${alvo.tipo === 'pacote' ? 'p' : 'a'}:${alvo.id}` : '',
      valor: inicial?.valor ?? alvo?.saldo ?? '',
      data: inicial?.data || diaLocal(),
      forma: inicial?.forma || 'pix',
      observacoes: inicial?.observacoes || '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, alvo?.tipo, alvo?.id, inicial?.id])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const itemAtual = itens.find((i) => i.chave === f.chave)

  function mudarItem(e) {
    const item = itens.find((i) => i.chave === e.target.value)
    setF((x) => ({ ...x, chave: e.target.value, valor: item?.saldo ?? x.valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    const valor = num(f.valor)
    if (valor <= 0) return setErro('Informe um valor maior que zero.')
    if (!editando && !f.chave) return setErro('Escolha a que se refere o pagamento.')
    if (!editando && itemAtual && valor > itemAtual.saldo + 0.001)
      return setErro(`O valor é maior que o saldo em aberto (${fmtMoeda(itemAtual.saldo)}).`)
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await run(
          supabase
            .from('pagamentos')
            .update({ valor, data: f.data, forma: f.forma, observacoes: vazioParaNull(f.observacoes.trim()) })
            .eq('id', inicial.id)
        )
      } else {
        const [tipo, id] = f.chave.split(':')
        await run(
          supabase.from('pagamentos').insert({
            cliente_id: clienteId,
            atendimento_id: tipo === 'a' ? Number(id) : null,
            pacote_id: tipo === 'p' ? Number(id) : null,
            valor,
            data: f.data,
            forma: f.forma,
            observacoes: vazioParaNull(f.observacoes.trim()),
          })
        )
      }
      toast(editando ? 'Pagamento atualizado' : 'Pagamento registrado')
      onSalvo?.()
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar pagamento' : 'Registrar pagamento'}
      rodape={<Rodape onFechar={onFechar} salvando={salvando} form="form-pagamento" />}
    >
      <form id="form-pagamento" className="form" onSubmit={salvar}>
        <Erro erro={erro} />
        {!editando &&
          (itens.length === 0 ? (
            <div className="alerta alerta-info">Esta cliente não tem nada em aberto para pagar.</div>
          ) : (
            <Campo rotulo="Referente a" dica={itemAtual ? `Saldo em aberto: ${fmtMoeda(itemAtual.saldo)}` : null}>
              <select value={f.chave || ''} onChange={mudarItem}>
                {itens.map((i) => (
                  <option key={i.chave} value={i.chave}>
                    {i.label} — falta {fmtMoeda(i.saldo)}
                  </option>
                ))}
              </select>
            </Campo>
          ))}
        <div className="grade-2">
          <Campo rotulo="Valor pago" obrigatorio dica="Pode ser menor que o saldo (pagamento parcial).">
            <InputMoeda value={f.valor} onChange={(v) => setF((x) => ({ ...x, valor: v }))} autoFocus />
          </Campo>
          <Campo rotulo="Data">
            <input type="date" value={f.data || ''} onChange={set('data')} />
          </Campo>
        </div>
        <Campo rotulo="Forma de pagamento">
          <select value={f.forma} onChange={set('forma')}>
            {Object.entries(FORMAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Observações">
          <input value={f.observacoes || ''} onChange={set('observacoes')} />
        </Campo>
      </form>
    </Modal>
  )
}

/* ========================= Tratamento ========================== */
export function TratamentoForm({ aberto, onFechar, onSalvo, inicial }) {
  const toast = useToast()
  const [f, setF] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setF({ nome: inicial?.nome || '', preco_padrao: inicial?.preco_padrao ?? '', ativo: inicial?.ativo ?? true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inicial?.id])

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return setErro('Informe o nome do tratamento.')
    setSalvando(true)
    setErro('')
    const dados = { nome: f.nome.trim(), preco_padrao: num(f.preco_padrao), ativo: f.ativo }
    try {
      if (inicial?.id) await run(supabase.from('tratamentos').update(dados).eq('id', inicial.id))
      else await run(supabase.from('tratamentos').insert(dados))
      toast(inicial?.id ? 'Tratamento atualizado' : 'Tratamento criado')
      onSalvo?.()
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial?.id ? 'Editar tratamento' : 'Novo tratamento'}
      largura={440}
      rodape={<Rodape onFechar={onFechar} salvando={salvando} form="form-tratamento" />}
    >
      <form id="form-tratamento" className="form" onSubmit={salvar}>
        <Erro erro={erro} />
        <Campo rotulo="Nome" obrigatorio>
          <input value={f.nome || ''} onChange={(e) => setF((x) => ({ ...x, nome: e.target.value }))} autoFocus />
        </Campo>
        <Campo rotulo="Preço padrão" dica="Preenchido automaticamente ao agendar. Pode ser alterado na sessão.">
          <InputMoeda value={f.preco_padrao} onChange={(v) => setF((x) => ({ ...x, preco_padrao: v }))} />
        </Campo>
        <label className="check">
          <input type="checkbox" checked={!!f.ativo} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))} />
          <span>Ativo (aparece nas opções de agendamento)</span>
        </label>
      </form>
    </Modal>
  )
}
