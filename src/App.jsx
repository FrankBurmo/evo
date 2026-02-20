import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a GitHub token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test the token by making a request
      const response = await fetch('/api/health');
      if (response.ok) {
        localStorage.setItem('github_token', token);
        setIsAuthenticated(true);
      } else {
        setError('Failed to authenticate');
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setToken('');
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <Dashboard token={token} onLogout={handleLogout} />;
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-hero-logo">⚡</div>
        <h1>Product Orchestrator</h1>
        <p>Analyser dine GitHub repositories og få AI-drevne anbefalinger for produktutvikling</p>
      </div>

      <div className="auth-section">
        <h2>Koble til GitHub</h2>
        <p className="auth-subtitle">Skriv inn ditt Personal Access Token for å starte</p>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>GitHub Token</label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Kobler til...' : 'Start analyse →'}
          </button>
        </form>

        {error && <div className="error" style={{ marginTop: '14px', padding: '12px 14px', fontSize: '0.87rem' }}>{error}</div>}

        <div className="info">
          <strong>Trenger du hjelp?</strong>
          <p style={{ marginTop: '4px' }}>
            Token trenger <code style={{ background: 'rgba(108,99,255,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.85em' }}>repo</code> tilgang. Lag den på{' '}
            <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">
              github.com/settings/tokens
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
