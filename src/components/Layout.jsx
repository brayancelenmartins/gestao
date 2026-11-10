import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Home, LogOut, Sparkles, Users, Wallet } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { NOME_CLINICA } from '../lib/supabase'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: 'Início', icone: Home, end: true },
  { to: '/clientes', label: 'Clientes', icone: Users },
  { to: '/agenda', label: 'Agenda', icone: CalendarDays },
  { to: '/financeiro', label: 'Financeiro', icone: Wallet },
  { to: '/tratamentos', label: 'Tratamentos', icone: Sparkles },
]

export default function Layout() {
  const { membro, sair } = useAuth()
  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <span className="marca-logo">✿</span>
          <span className="marca-nome">{NOME_CLINICA}</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-item">
              <n.icone size={19} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="lateral-usuario">
          <Avatar nome={membro?.nome} tamanho="sm" />
          <span className="lateral-usuario-nome">{membro?.nome}</span>
          <button className="btn-icone" onClick={sair} title="Sair" aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <header className="topo-mobile">
        <div className="marca">
          <span className="marca-logo">✿</span>
          <span className="marca-nome">{NOME_CLINICA}</span>
        </div>
        <button className="btn-icone" onClick={sair} aria-label="Sair">
          <LogOut size={19} />
        </button>
      </header>

      <main className="conteudo">
        <Outlet />
      </main>

      <nav className="nav-inferior">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-inferior-item">
            <n.icone size={21} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Cabecalho({ titulo, subtitulo, children }) {
  return (
    <div className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="cabecalho-sub">{subtitulo}</p>}
      </div>
      {children && <div className="cabecalho-acoes">{children}</div>}
    </div>
  )
}
