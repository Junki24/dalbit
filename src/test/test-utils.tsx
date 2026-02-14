import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import type { ReactNode } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

interface TestWrapperOptions {
  initialEntries?: string[]
  withAuth?: boolean
}

function createWrapper(options: TestWrapperOptions = {}) {
  const { initialEntries = ['/'], withAuth = true } = options
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    const content = (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )

    if (withAuth) {
      return (
        <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={initialEntries}>
                {children}
              </MemoryRouter>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
        </ThemeProvider>
      )
    }

    return content
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & TestWrapperOptions
) {
  const { initialEntries, withAuth, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: createWrapper({ initialEntries, withAuth }),
    ...renderOptions,
  })
}

export { render }
