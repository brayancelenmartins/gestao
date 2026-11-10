import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { configurado } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/auth'
import { TelaCarregando, UIProvider } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Painel from './pages/Painel'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Agenda from './pages/Agenda'
import Financeiro from './pages/Financeiro'
import Tratamentos from './pages/Tratamentos'

function Portao() {
  const { session, membro, sair } = useAuth()
  if (session === undefined) return <TelaCarregando />
  if (!session) return <Login />
  if (membro === undefined) return <TelaCarregando />
  if (!membro)
    return (
      <div className="tela-cheia">
        <div className="cartao aviso-acesso">
          <ShieldAlert size={32} />
          <h2>Acesso não autorizado</h2>
          <p>
            Sua conta ({session.user.email}) ainda não foi liberada. Peça para a administradora da
            clínica liberar o seu acesso.
          </p>
          <button className="btn btn-primario" onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    )

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Painel />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalhe />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="tratamentos" element={<Tratamentos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  if (!configurado)
    return (
      <div className="tela-cheia">
        <div className="cartao aviso-acesso">
          <h2>Falta configurar o Supabase</h2>
          <p>
            Crie o arquivo <code>.env</code> (veja <code>.env.example</code>) com{' '}
            <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. No Render, cadastre
            essas variáveis em <em>Environment</em> e faça um novo deploy.
          </p>
        </div>
      </div>
    )
  return (
    <UIProvider>
      <AuthProvider>
        <Portao />
      </AuthProvider>
    </UIProvider>
  )
}
