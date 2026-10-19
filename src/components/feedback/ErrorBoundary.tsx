import { Component, type ReactNode } from 'react';

interface Props {
  resetKey: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/* Keeps the shell usable if one page throws; resets when the route changes. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <div className="callout c-err">
          <div>
            <b>This page failed to load. </b>
            {error.message || String(error)}
          </div>
        </div>
        <a className="btn primary mt14" href="#/dashboard">
          Go to Dashboard
        </a>
      </div>
    );
  }
}
