import { useCallback } from 'react'

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [30, 50, 30, 50, 30],
}

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    if (!navigator.vibrate) return
    navigator.vibrate(PATTERNS[pattern])
  }, [])

  return { vibrate }
}
