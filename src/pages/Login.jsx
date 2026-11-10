import { useState } from 'react'
import { Lock, Mail } from 'lucide-react'
import { mensagemErro, NOME_CLINICA, supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) setErro(mensagemErro(error))
    setEntrando(false)
  }

  return (
    <div className="login">
      <div className="login-arte" aria-hidden>
        <div className="login-arte-texto">
          <span className="marca-logo grande">✿</span>
          <h2>Cuidado que se vê.</h2>
          <p>Clientes, sessões, pacotes e pagamentos em um só lugar.</p>
        </div>
      </div>
      <div className="login-painel">
        <form className="login-form" onSubmit={entrar}>
          <div className="marca">
            <span className="marca-logo">✿</span>
            <span className="marca-nome">{NOME_CLINICA}</span>
          </div>
          <h1>Acesse sua conta</h1>
          <p className="muted">Entre com o e-mail e a senha que a clínica cadastrou para você.</p>
          {erro && <div className="alerta alerta-danger">{erro}</div>}
          <label className="campo">
            <span className="campo-rotulo">E-mail</span>
            <div className="input-icone">
              <Mail size={16} />
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Senha</span>
            <div className="input-icone">
              <Lock size={16} />
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </label>
          <button className="btn btn-primario btn-grande" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="login-rodape">Acesso restrito à equipe da clínica.</p>
        </form>
      </div>
    </div>
  )
}
