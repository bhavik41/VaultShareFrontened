import React from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-vs-bg p-6">
          <div className="max-w-md w-full bg-vs-card border border-vs-border rounded-2xl p-8 shadow-lg text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-vs-error-surface/40 flex items-center justify-center">
              <AlertTriangle size={28} className="text-vs-error" />
            </div>
            <h1 className="text-xl font-bold text-vs-heading">Something went wrong</h1>
            <p className="text-sm text-vs-muted">
              An unexpected error occurred. Try refreshing the page or going back.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-vs-brand hover:opacity-90 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-opacity"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = "/dashboard" }}
                className="px-5 py-2.5 bg-vs-card border border-vs-border hover:bg-vs-hover text-sm font-medium text-vs-body rounded-lg cursor-pointer transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
