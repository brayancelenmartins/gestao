import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { run, supabase } from '../lib/supabase'
import { normalizar } from '../lib/format'
import { Avatar } from './ui'

/** Campo de busca para escolher uma cliente pelo nome. */
export default function ClientePicker({ valor, onEscolher }) {
  const [clientes, setClientes] = useState([])
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    run(supabase.from('clientes').select('id, nome, telefone').order('nome'))
      .then(setClientes)
      .catch(() => setClientes([]))
  }, [])

  useEffect(() => {
    const fora = (e) => !ref.current?.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  const escolhida = clientes.find((c) => c.id === valor)
  const filtradas = useMemo(() => {
    const t = normalizar(texto)
    return clientes.filter((c) => !t || normalizar(c.nome).includes(t)).slice(0, 30)
  }, [clientes, texto])

  return (
    <div className="picker" ref={ref}>
      <div className="input-icone">
        <Search size={16} />
        <input
          placeholder="Buscar cliente pelo nome…"
          value={aberto ? texto : escolhida?.nome || texto}
          onFocus={() => {
            setAberto(true)
            setTexto('')
          }}
          onChange={(e) => {
            setTexto(e.target.value)
            setAberto(true)
          }}
        />
      </div>
      {aberto && (
        <div className="picker-lista">
          {filtradas.length === 0 && <div className="picker-vazio">Nenhuma cliente encontrada</div>}
          {filtradas.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`picker-item ${c.id === valor ? 'ativo' : ''}`}
              onClick={() => {
                onEscolher(c.id)
                setTexto('')
                setAberto(false)
              }}
            >
              <Avatar nome={c.nome} tamanho="sm" />
              <span>
                <strong>{c.nome}</strong>
                {c.telefone && <small>{c.telefone}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
