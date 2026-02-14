import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastContext'

function TestConsumer() {
  const { showToast, toasts } = useToast()
  return (
    <div>
      <button onClick={() => showToast('테스트 메시지', 'success')}>토스트</button>
      <span data-testid="count">{toasts.length}</span>
      {toasts.map((t) => (
        <span key={t.id} data-testid="toast-msg">{t.message}</span>
      ))}
    </div>
  )
}

function ConfirmConsumer() {
  const { confirm, confirmState, handleConfirmResolve } = useToast()
  return (
    <div>
      <button onClick={() => {
        // Fire and forget — don't await, so the render cycle can continue
        confirm({
          title: '삭제 확인',
          message: '정말 삭제하시겠습니까?',
          confirmText: '삭제',
          cancelText: '취소',
          danger: true,
        })
      }}>확인요청</button>
      {confirmState && (
        <div>
          <span data-testid="confirm-title">{confirmState.options.title}</span>
          <button data-testid="btn-ok" onClick={() => handleConfirmResolve(true)}>확인</button>
          <button data-testid="btn-cancel" onClick={() => handleConfirmResolve(false)}>취소</button>
        </div>
      )}
    </div>
  )
}

describe('ToastContext', () => {
  it('ToastProvider 없이 useToast 호출하면 에러', () => {
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useToast must be used within ToastProvider')
  })

  it('showToast로 토스트 추가', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    expect(screen.getByTestId('count').textContent).toBe('0')
    act(() => {
      screen.getByText('토스트').click()
    })
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('toast-msg').textContent).toBe('테스트 메시지')
  })

  it('토스트 3초 후 자동 제거', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('토스트').click()
    })
    expect(screen.getByTestId('count').textContent).toBe('1')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByTestId('count').textContent).toBe('0')
    vi.useRealTimers()
  })

  it('confirm 다이얼로그 표시', () => {
    render(
      <ToastProvider>
        <ConfirmConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('확인요청').click()
    })
    expect(screen.getByTestId('confirm-title').textContent).toBe('삭제 확인')
    expect(screen.getByTestId('btn-ok')).toBeInTheDocument()
    expect(screen.getByTestId('btn-cancel')).toBeInTheDocument()
  })

  it('confirm 확인 클릭 시 다이얼로그 닫힘', () => {
    render(
      <ToastProvider>
        <ConfirmConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('확인요청').click()
    })
    expect(screen.getByTestId('confirm-title')).toBeInTheDocument()

    act(() => {
      screen.getByTestId('btn-ok').click()
    })
    expect(screen.queryByTestId('confirm-title')).toBeNull()
  })

  it('confirm 취소 클릭 시 다이얼로그 닫힘', () => {
    render(
      <ToastProvider>
        <ConfirmConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('확인요청').click()
    })
    expect(screen.getByTestId('confirm-title')).toBeInTheDocument()

    act(() => {
      screen.getByTestId('btn-cancel').click()
    })
    expect(screen.queryByTestId('confirm-title')).toBeNull()
  })
})
