import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import { iniciais } from '../lib/format'

/* ------------------------------ Badge ------------------------------ */
export function Badge({ tom = 'muted', children }) {
  return <span className={`badge badge-${tom}`}>{children}</span>
}

/* ------------------------------ Avatar ----------------------------- */
const CORES = ['rose', 'sage', 'sand', 'lilac', 'sky']
export function Avatar({ nome, tamanho = 'md' }) {
  const n = [...(nome || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  return (
    <span className={`avatar avatar-${tamanho} avatar-${CORES[n % CORES.length]}`} aria-hidden>
      {iniciais(nome)}
    </span>
  )
}

/* ------------------------------ Spinner ---------------------------- */
export function Spinner({ texto }) {
  return (
    <div className="spinner-wrap">
      <Loader2 className="spin" size={22} />
      {texto && <span>{texto}</span>}
    </div>
  )
}

export function TelaCarregando() {
  return (
    <div className="tela-cheia">
      <Spinner texto="Carregando…" />
    </div>
  )
}

/* ------------------------------ Vazio ------------------------------ */
export function Vazio({ icone: Icone, titulo, texto, children }) {
  return (
    <div className="vazio">
      {Icone && (
        <span className="vazio-icone">
          <Icone size={22} />
        </span>
      )}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

export function ErroCarregar({ erro, onTentar }) {
  return (
    <div className="alerta alerta-danger">
      <AlertTriangle size={18} />
      <div>
        <strong>Não foi possível carregar.</strong>
        <div className="muted">{erro?.message || String(erro)}</div>
      </div>
      {onTentar && (
        <button className="btn btn-sm" onClick={onTentar}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

/* ------------------------------ Modal ------------------------------ */
export function Modal({ aberto, onFechar, titulo, children, rodape, largura = 520 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const tecla = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', tecla)
    document.body.classList.add('sem-scroll')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('sem-scroll')
    }
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" style={{ maxWidth: largura }} role="dialog" aria-modal="true" ref={ref}>
        <div className="modal-cabeca">
          <h2>{titulo}</h2>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  )
}

/* ------------------------------ Confirmar -------------------------- */
const ConfirmCtx = createContext(null)
const ToastCtx = createContext(null)

export function UIProvider({ children }) {
  const [confirm, setConfirm] = useState(null)
  const [toasts, setToasts] = useState([])

  const confirmar = useCallback(
    (opcoes) =>
      new Promise((resolve) => {
        setConfirm({ ...opcoes, resolve })
      }),
    []
  )

  const toast = useCallback((texto, tom = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, texto, tom }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const fechar = (valor) => {
    confirm?.resolve(valor)
    setConfirm(null)
  }

  return (
    <ConfirmCtx.Provider value={confirmar}>
      <ToastCtx.Provider value={toast}>
        {children}
        <Modal
          aberto={!!confirm}
          onFechar={() => fechar(false)}
          titulo={confirm?.titulo || 'Confirmar'}
          largura={420}
          rodape={
            <>
              <button className="btn" onClick={() => fechar(false)}>
                Cancelar
              </button>
              <button
                className={`btn ${confirm?.perigo ? 'btn-perigo' : 'btn-primario'}`}
                onClick={() => fechar(true)}
              >
                {confirm?.botao || 'Confirmar'}
              </button>
            </>
          }
        >
          <p className="confirm-texto">{confirm?.texto}</p>
        </Modal>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.tom}`}>
              {t.tom === 'danger' ? <AlertTriangle size={18} /> : t.tom === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
              <span>{t.texto}</span>
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </ConfirmCtx.Provider>
  )
}

export const useConfirmar = () => useContext(ConfirmCtx)
export const useToast = () => useContext(ToastCtx)

/* ------------------------------ Campos ----------------------------- */
export function Campo({ rotulo, dica, children, obrigatorio, className = '' }) {
  return (
    <label className={`campo ${className}`}>
      <span className="campo-rotulo">
        {rotulo}
        {obrigatorio && <span className="obrigatorio"> *</span>}
      </span>
      {children}
      {dica && <span className="campo-dica">{dica}</span>}
    </label>
  )
}

export function InputMoeda({ value, onChange, ...props }) {
  return (
    <div className="input-prefixo">
      <span>R$</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  )
}

/* ------------------------------ Tabs ------------------------------- */
export function Abas({ abas, ativa, onMudar }) {
  return (
    <div className="abas" role="tablist">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={ativa === a.id}
          className={`aba ${ativa === a.id ? 'ativa' : ''}`}
          onClick={() => onMudar(a.id)}
        >
          {a.label}
          {a.contador != null && <span className="aba-contador">{a.contador}</span>}
        </button>
      ))}
    </div>
  )
}

export function Chips({ opcoes, valor, onMudar }) {
  return (
    <div className="chips">
      {opcoes.map((o) => (
        <button
          key={o.id}
          className={`chip ${valor === o.id ? 'ativo' : ''}`}
          onClick={() => onMudar(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ Menu ------------------------------- */
export function Menu({ itens, rotulo = 'Mais ações', icone }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => !ref.current?.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
    }
  }, [aberto])

  return (
    <div className="menu" ref={ref}>
      <button
        className="btn-icone"
        aria-label={rotulo}
        onClick={(e) => {
          e.stopPropagation()
          setAberto((a) => !a)
        }}
      >
        {icone}
      </button>
      {aberto && (
        <div className="menu-lista" role="menu">
          {itens.filter(Boolean).map((it) => (
            <button
              key={it.label}
              role="menuitem"
              className={`menu-item ${it.perigo ? 'perigo' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setAberto(false)
                it.onClick()
              }}
            >
              {it.icone && <it.icone size={16} />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Stat ------------------------------- */
export function Stat({ rotulo, valor, detalhe, icone: Icone, tom = 'rose' }) {
  return (
    <div className={`stat stat-${tom}`}>
      <div className="stat-topo">
        <span className="stat-rotulo">{rotulo}</span>
        {Icone && (
          <span className="stat-icone">
            <Icone size={18} />
          </span>
        )}
      </div>
      <div className="stat-valor">{valor}</div>
      {detalhe && <div className="stat-detalhe">{detalhe}</div>}
    </div>
  )
}

export function Progresso({ atual, total }) {
  const pct = total ? Math.min(100, Math.round((atual / total) * 100)) : 0
  return (
    <div className="progresso" aria-label={`${atual} de ${total}`}>
      <div className="progresso-barra" style={{ width: `${pct}%` }} />
    </div>
  )
}
