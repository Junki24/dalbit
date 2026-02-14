import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { OfflineBanner } from '../OfflineBanner'

describe('OfflineBanner', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    window,
    'navigator'
  )

  let onlineHandler: (() => void) | undefined
  let offlineHandler: (() => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    onlineHandler = undefined
    offlineHandler = undefined

    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === 'online') onlineHandler = handler as () => void
        if (event === 'offline') offlineHandler = handler as () => void
      }
    )
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {})
  })

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator)
    }
    vi.restoreAllMocks()
  })

  it('온라인 상태에서는 렌더링되지 않음', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    const { container } = render(<OfflineBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('오프라인 상태에서 배너가 표시됨', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    render(<OfflineBanner />)
    expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument()
  })

  it('오프라인 배너에 📡 아이콘이 표시됨', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    render(<OfflineBanner />)
    expect(screen.getByText('📡')).toBeInTheDocument()
  })

  it('오프라인 → 온라인 전환 시 배너 숨김', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    const { container } = render(<OfflineBanner />)
    expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument()

    // Simulate going online
    act(() => {
      onlineHandler?.()
    })

    expect(container.querySelector('.offline-banner')).toBeNull()
  })

  it('온라인 → 오프라인 전환 시 배너 표시', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    render(<OfflineBanner />)
    expect(screen.queryByText(/오프라인 상태입니다/)).not.toBeInTheDocument()

    // Simulate going offline
    act(() => {
      offlineHandler?.()
    })

    expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument()
  })

  it('언마운트 시 이벤트 리스너 정리', () => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    const { unmount } = render(<OfflineBanner />)
    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    )
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    )
  })
})
