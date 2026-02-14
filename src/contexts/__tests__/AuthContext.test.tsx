import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { mockSupabase, mockUser, mockUserSettings } from '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { useAuth } from '../AuthContext'

// Helper component to consume AuthContext
function AuthConsumer() {
  const { user, userSettings, loading, isConfigured } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="configured">{String(isConfigured)}</span>
      <span data-testid="user">{user?.email ?? 'null'}</span>
      <span data-testid="settings">{userSettings?.display_name ?? 'null'}</span>
    </div>
  )
}

function SignInButton() {
  const { signInWithGoogle } = useAuth()
  return <button onClick={signInWithGoogle}>login</button>
}

function SignOutButton() {
  const { signOut } = useAuth()
  return <button onClick={signOut}>logout</button>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no session
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('useAuth를 AuthProvider 밖에서 사용하면 에러', () => {
    expect(() => {
      renderWithProviders(<AuthConsumer />, { withAuth: false })
    }).toThrow('useAuth must be used within AuthProvider')
  })

  it('세션 없으면 user=null, loading=false', async () => {
    renderWithProviders(<AuthConsumer />, { withAuth: true })
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('isConfigured는 true (mock 기본값)', async () => {
    renderWithProviders(<AuthConsumer />, { withAuth: true })
    await waitFor(() => {
      expect(screen.getByTestId('configured').textContent).toBe('true')
    })
  })

  it('세션 있으면 user 설정됨', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    })
    // user_settings fetch 결과
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserSettings, error: null }),
    }
    mockSupabase.from.mockReturnValue(fromMock)

    renderWithProviders(<AuthConsumer />, { withAuth: true })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })
  })

  it('signInWithGoogle이 supabase.auth.signInWithOAuth 호출', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    renderWithProviders(<SignInButton />, { withAuth: true })

    await waitFor(() => {
      expect(screen.getByText('login')).toBeInTheDocument()
    })

    await user.click(screen.getByText('login'))

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    })
  })

  it('signOut이 supabase.auth.signOut 호출', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    renderWithProviders(<SignOutButton />, { withAuth: true })

    await waitFor(() => {
      expect(screen.getByText('logout')).toBeInTheDocument()
    })

    await user.click(screen.getByText('logout'))

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('onAuthStateChange 구독이 등록됨', async () => {
    renderWithProviders(<AuthConsumer />, { withAuth: true })
    await waitFor(() => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })
  })

  it('언마운트 시 subscription.unsubscribe 호출', async () => {
    const unsubscribe = vi.fn()
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    })

    const { unmount } = renderWithProviders(<AuthConsumer />, { withAuth: true })

    await waitFor(() => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
