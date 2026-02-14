import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Ensure cleanup after each test
afterEach(() => {
  cleanup()
})

// Suppress act() warnings from AuthProvider's async getSession() in useEffect
// This is a known issue with React 19 + async state updates in providers
// The mock getSession resolves immediately, but the microtask still triggers outside act()
const originalConsoleError = console.error
console.error = (...args: Parameters<typeof console.error>) => {
  const message = typeof args[0] === 'string' ? args[0] : ''
  if (
    message.includes('act(') ||
    message.includes('not wrapped in act') ||
    message.includes('An update to') && message.includes('inside a test was not wrapped')
  ) {
    return // Suppress act() warnings
  }
  originalConsoleError(...args)
}
