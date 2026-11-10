import { useState } from 'react'
import { MoreVertical, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { mensagemErro, run, supabase } from '../lib/supabase'
import { useLoad } from '../lib/hooks'
import { fmtMoeda } from '../lib/format'
import { Cabecalho } from '../components/Layout'
import { Badge, ErroCarregar, Menu, Spinner, Vazio, useConfirmar, useToast } from '../components/ui'
import { TratamentoForm } from '../components/Forms'

export default function Tratamentos() {
  const toast = useToast()
  const confirmar = useConfirmar()
  const [modal, setModal] = useState(null)
  const { data, loading, error, reload } = useLoad(() => run(supabase.from('tratamentos').select('*').order('nome')))

  async function alternar(t) {
    try {
      await run(supabase.from('tratamentos').update({ ativo: !t.ativo }).eq('id', t.id))
      reload()
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  async function excluir(t) {
    const ok = await confirmar({
      titulo: `Excluir “${t.nome}”?`,
      texto: 'As sessões e pacotes antigos continuam salvos, mas ficarão sem tratamento. Se quiser apenas esconder, use “Desativar”.',
      botao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    try {
      await run(supabase.from('tratamentos').delete().eq('id', t.id))
      toast('Tratamento excluído')
      reload()
    } catch (e) {
      toast(mensagemErro(e), 'danger')
    }
  }

  return (
    <div className="pagina">
      <Cabecalho titulo="Tratamentos" subtitulo="Serviços oferecidos e preços padrão">
        <button className="btn btn-primario" onClick={() => setModal({})}>
          <Plus size={17} /> Novo tratamento
        </button>
      </Cabecalho>

      {error && <ErroCarregar erro={error} onTentar={reload} />}

      {loading && !data ? (
        <Spinner />
      ) : !data?.length ? (
        <Vazio icone={Sparkles} titulo="Nenhum tratamento cadastrado">
          <button className="btn btn-primario btn-sm" onClick={() => setModal({})}>
            <Plus size={16} /> Novo tratamento
          </button>
        </Vazio>
      ) : (
        <div className="grade-tratamentos">
          {data.map((t) => (
            <div key={t.id} className={`cartao tratamento ${t.ativo ? '' : 'inativo'}`}>
              <span className="tratamento-icone"><Sparkles size={18} /></span>
              <div className="tratamento-info">
                <strong>{t.nome}</strong>
                <span className="tratamento-preco">{fmtMoeda(t.preco_padrao)}</span>
              </div>
              {!t.ativo && <Badge tom="muted">Inativo</Badge>}
              <Menu
                icone={<MoreVertical size={18} />}
                itens={[
                  { label: 'Editar', icone: Pencil, onClick: () => setModal(t) },
                  { label: t.ativo ? 'Desativar' : 'Ativar', icone: Sparkles, onClick: () => alternar(t) },
                  { label: 'Excluir', icone: Trash2, perigo: true, onClick: () => excluir(t) },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      <TratamentoForm aberto={!!modal} inicial={modal} onFechar={() => setModal(null)} onSalvo={reload} />
    </div>
  )
}
