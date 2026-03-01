import React from 'react';

/**
 * ErrorBoundary — fanger uventede React-feil og viser reserveinnhold.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-content">
            <h2>⚠️ Noe gikk galt</h2>
            <p>En uventet feil oppstod. Prøv å laste siden på nytt.</p>
            <pre className="error-boundary-details">
              {this.state.error?.message || 'Ukjent feil'}
            </pre>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Last inn på nytt
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
