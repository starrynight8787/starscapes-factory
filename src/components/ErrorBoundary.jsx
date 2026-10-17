import { Component } from 'react'
import { useLocation } from 'react-router-dom'
import ErrorPage from '../pages/ErrorPage'

// Catches a page that breaks while it is being drawn, and shows the error page instead of a blank screen.
// It lets go again when the visitor goes to another page, so one broken page never spoils the rest of the site.
class Catcher extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error(error, info && info.componentStack)
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    if (this.state.failed) return <ErrorPage onRetry={() => this.setState({ failed: false })} />
    return this.props.children
  }
}

export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <Catcher resetKey={pathname}>{children}</Catcher>
}
