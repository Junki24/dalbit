import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function usePageTransition() {
  const location = useLocation()
  const [displayState, setDisplayState] = useState<'enter' | 'visible'>('visible')

  useEffect(() => {
    setDisplayState('enter')
    const timer = requestAnimationFrame(() => {
      // Next frame: trigger transition to visible
      requestAnimationFrame(() => {
        setDisplayState('visible')
      })
    })
    return () => cancelAnimationFrame(timer)
  }, [location.pathname])

  return {
    className: `page-transition ${displayState === 'enter' ? 'page-transition--enter' : 'page-transition--visible'}`,
  }
}
