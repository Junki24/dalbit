import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { mockSupabase, mockUser } from '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('loading 중이면 로딩 화면 표시', () => {
    // getSession이 resolve되지 않도록 pending 상태 유지
    mockSupabase.auth.getSession.mockReturnValue(new Promise(() => {}))

    renderWithProviders(
      <ProtectedRoute><div>protected content</div></ProtectedRoute>,
      { withAuth: true }
    )

    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('user 없으면 /login으로 리다이렉트 (children 미렌더)', async () => {
    renderWithProviders(
      <ProtectedRoute><div>protected content</div></ProtectedRoute>,
      { withAuth: true }
    )

    await waitFor(() => {
      expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    })
  })

  it('user 있으면 children 렌더링', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    })
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockSupabase.from.mockReturnValue(fromMock)

    renderWithProviders(
      <ProtectedRoute><div>protected content</div></ProtectedRoute>,
      { withAuth: true }
    )

    await waitFor(() => {
      expect(screen.getByText('protected content')).toBeInTheDocument()
    })
  })

  it('로딩 화면에 달 아이콘 표시', () => {
    mockSupabase.auth.getSession.mockReturnValue(new Promise(() => {}))

    renderWithProviders(
      <ProtectedRoute><div>content</div></ProtectedRoute>,
      { withAuth: true }
    )

    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })
})
