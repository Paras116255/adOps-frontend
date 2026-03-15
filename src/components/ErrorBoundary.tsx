/**
 * Global error boundary — catches unhandled React render errors.
 * Wrap the root app tree with this to prevent blank screens on crashes.
 */
import { Component, type ReactNode, type ErrorInfo } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  /** Optional custom fallback UI — receives the error and a reset function */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console — swap for a real error reporting service (Sentry etc.) in production
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-2">
              An unexpected error occurred. The error has been logged.
            </p>
            <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 mb-6 text-left break-all">
              {error.message}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.reset}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium
                           hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={15} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full border py-2.5 rounded-xl text-sm text-gray-600
                           hover:bg-gray-50 transition"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
