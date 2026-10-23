import { useCallback, useEffect, useRef, useState } from 'react'
import { parseExperience } from './model'
import type { Experience, LightId, SpaceId } from './model'

const currentExperience = (): Experience => parseExperience(typeof window === 'undefined' ? '' : window.location.search)

function experienceUrl(state: Experience): string {
  const url = new URL(window.location.href)
  url.searchParams.set('space', state.space)
  url.searchParams.set('light', state.light)
  return `${url.pathname}${url.search}${url.hash}`
}

export default function useExperience() {
  const [experience, setExperience] = useState<Experience>(currentExperience)
  const current = useRef(experience)

  useEffect(() => {
    const restore = () => {
      const restored = currentExperience()
      current.current = restored
      setExperience(restored)
    }
    // Normalize explicit invalid values without adding an unnecessary history entry.
    const params = new URLSearchParams(window.location.search)
    const initial = currentExperience()
    if ((params.has('space') && params.get('space') !== initial.space) || (params.has('light') && params.get('light') !== initial.light)) {
      window.history.replaceState(window.history.state, '', experienceUrl(initial))
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const select = useCallback((change: Partial<Experience>) => {
    // Read the ref synchronously so rapidly interrupted choices compose correctly.
    const next = { ...current.current, ...change }
    const normalized = parseExperience(`?space=${encodeURIComponent(next.space)}&light=${encodeURIComponent(next.light)}`)
    if (normalized.space === current.current.space && normalized.light === current.current.light) return
    current.current = normalized
    window.history.pushState(window.history.state, '', experienceUrl(normalized))
    setExperience(normalized)
  }, [])

  const setSpace = useCallback((space: SpaceId) => select({ space }), [select])
  const setLight = useCallback((light: LightId) => select({ light }), [select])
  return { ...experience, setSpace, setLight }
}
