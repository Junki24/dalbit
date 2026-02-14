import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/contexts/ToastContext'
import { ToastContainer, ConfirmDialog } from '../Toast'

// Helper to trigger a toast from within the provider
function ToastTrigger({ message, type }: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(message, type)}>show</button>
}

function ConfirmTrigger() {
  const { confirm } = useToast()
  return (
    <button onClick={() => confirm({
      title: '테스트 타이틀',
      message: '테스트 메시지입니다',
      confirmText: '확인',
      cancelText: '취소',
      danger: true,
    })}>
      trigger-confirm
    </button>
  )
}

describe('ToastContainer', () => {
  it('토스트 없으면 렌더링 안 됨', () => {
    const { container } = render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>
    )
    expect(container.querySelector('.toast-container')).toBeNull()
  })

  it('토스트 표시 시 아이콘과 메시지 렌더링', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger message="저장 완료" type="success" />
        <ToastContainer />
      </ToastProvider>
    )

    await user.click(screen.getByText('show'))
    expect(screen.getByText('저장 완료')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('에러 타입 토스트 표시', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger message="오류 발생" type="error" />
        <ToastContainer />
      </ToastProvider>
    )

    await user.click(screen.getByText('show'))
    expect(screen.getByText('오류 발생')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('role="status" 속성 존재', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger message="알림" type="info" />
        <ToastContainer />
      </ToastProvider>
    )

    await user.click(screen.getByText('show'))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('confirmState 없으면 렌더링 안 됨', () => {
    const { container } = render(
      <ToastProvider>
        <ConfirmDialog />
      </ToastProvider>
    )
    expect(container.querySelector('.confirm-overlay')).toBeNull()
  })

  it('confirm 트리거 시 다이얼로그 표시', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ConfirmTrigger />
        <ConfirmDialog />
      </ToastProvider>
    )

    await user.click(screen.getByText('trigger-confirm'))
    expect(screen.getByText('테스트 타이틀')).toBeInTheDocument()
    expect(screen.getByText('테스트 메시지입니다')).toBeInTheDocument()
    expect(screen.getByText('확인')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })

  it('role="alertdialog" 속성 존재', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ConfirmTrigger />
        <ConfirmDialog />
      </ToastProvider>
    )

    await user.click(screen.getByText('trigger-confirm'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('취소 클릭 시 다이얼로그 닫힘', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ConfirmTrigger />
        <ConfirmDialog />
      </ToastProvider>
    )

    await user.click(screen.getByText('trigger-confirm'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByText('취소'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
