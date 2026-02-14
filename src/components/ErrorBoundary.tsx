import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  isChunkError: boolean
}

/**
 * Detect stale chunk errors (after deploy, old cached page loads missing chunk)
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message?.toLowerCase() ?? ''
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('dynamically imported module') ||
    (error.name === 'TypeError' && msg.includes('failed to fetch'))
  )
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, isChunkError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)

    // Auto-reload on chunk error (stale cache after deploy)
    if (isChunkLoadError(error)) {
      const key = 'dalbit-chunk-reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return
      }
    }
  }

  handleReload = () => {
    // Clear chunk reload flag so next reload is fresh
    sessionStorage.removeItem('dalbit-chunk-reload')
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, isChunkError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">🌙</div>
          {this.state.isChunkError ? (
            <>
              <h2>앱이 업데이트되었습니다</h2>
              <p>새 버전이 있어요. 새로고침해주세요!</p>
              <div className="error-boundary-actions">
                <button className="btn-retry" onClick={this.handleReload}>
                  새로고침
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>문제가 발생했습니다</h2>
              <p>예기치 않은 오류가 발생했어요. 다시 시도해 주세요.</p>
              <div className="error-boundary-actions">
                <button className="btn-retry" onClick={this.handleReload}>
                  새로고침
                </button>
                <button className="btn-retry" onClick={this.handleReset}>
                  다시 시도
                </button>
                <a href="/" className="btn-home-link">
                  홈으로 이동
                </a>
              </div>
            </>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
