import { useCallback, useEffect, useState } from 'react'
import { store, type Theme } from './storage'

/** Tema salvo ou escuro (o padrão do visual); só grava quando a pessoa alterna. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => store.loadTheme() ?? 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      store.saveTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
