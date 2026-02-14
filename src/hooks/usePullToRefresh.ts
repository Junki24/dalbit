import { useRef, useCallback, useState } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
}

interface PullToRefreshResult {
  isRefreshing: boolean
  pullDistance: number
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: PullToRefreshOptions): PullToRefreshResult {
  const startY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isPulling = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when at top of page
    if (window.scrollY > 0 || isRefreshing) return
    startY.current = e.touches[0].clientY
    isPulling.current = true
  }, [isRefreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      // Apply resistance — diminishing returns
      const distance = Math.min(diff * 0.4, threshold * 1.5)
      setPullDistance(distance)
    }
  }, [threshold])

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5) // Settle to loading position
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh])

  return {
    isRefreshing,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
