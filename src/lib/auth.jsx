import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  // undefined = carregando | null = sem sessão
  const [session, setSession] = useState(undefined)
  const [membro, setMembro] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (session === undefined) return
    if (!userId) {
      setMembro(null)
      return
    }
    setMembro(undefined)
    supabase
      .from('membros')
      .select('nome')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setMembro(data || null))
  }, [userId, session === undefined])

  const sair = () => supabase.auth.signOut()

  return (
    <AuthCtx.Provider value={{ session, membro, sair }}>{children}</AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
