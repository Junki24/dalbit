import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh } from '../usePullToRefresh'

function createTouchEvent(clientY: number) {
  return {
    touches: [{ clientX: 0, clientY }],
    changedTouches: [{ clientX: 0, clientY }],
  } as unknown as React.TouchEvent
}

describe('usePullToRefresh', () => {
  it('초기 상태는 isRefreshing=false, pullDistance=0', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }))

    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.pullDistance).toBe(0)
  })

  it('handlers 객체 반환', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }))

    expect(result.current.handlers.onTouchStart).toBeDefined()
    expect(result.current.handlers.onTouchMove).toBeDefined()
    expect(result.current.handlers.onTouchEnd).toBeDefined()
  })

  it('당기기 동작 시 pullDistance 업데이트', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    // Mock window.scrollY = 0 for pull-to-refresh to activate
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 })
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(100))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200)) // 100px pull
    })

    // Should have some pull distance (with resistance applied)
    expect(result.current.pullDistance).toBeGreaterThan(0)
  })

  it('threshold 미만이면 리프레시 안 함', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 })
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(100))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(120)) // 20px — too little
    })
    await act(async () => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
