import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">🌙</div>
          <h2>문제가 발생했습니다</h2>
          <p>예기치 않은 오류가 발생했어요. 다시 시도해 주세요.</p>
          <div className="error-boundary-actions">
            <button className="btn-retry" onClick={this.handleReset}>
              다시 시도
            </button>
            <a href="/" className="btn-home-link">
              홈으로 이동
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
