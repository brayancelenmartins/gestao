import { useCallback, useEffect, useState } from 'react'

/**
 * Carrega dados de forma assíncrona.
 * Mantém os dados antigos na tela enquanto recarrega.
 */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => ativo && setState({ data, loading: false, error: null }))
      .catch((error) => ativo && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao])

  const reload = useCallback(() => setVersao((v) => v + 1), [])
  return { ...state, reload }
}

export function useMediaQuery(query) {
  const [ok, setOk] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = (e) => setOk(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return ok
}
