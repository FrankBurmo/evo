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
    <div className="app">
      <div className="header">
        <h1>🚀 Product Orchestrator</h1>
        <p>Analyser dine GitHub repositories og få anbefalinger for produktutvikling</p>
      </div>

      <div className="auth-section">
        <h2>Logg inn med GitHub Token</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="GitHub Personal Access Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logger inn...' : 'Start analyse'}
          </button>
        </form>

        {error && <div className="error" style={{ marginTop: '15px' }}>{error}</div>}

        <div className="info">
          <strong>💡 Trenger du hjelp?</strong>
          <p>
            Du trenger en GitHub Personal Access Token med <code>repo</code> tilgang.
            <br />
            Lag en ny token på:{' '}
            <a 
              href="https://github.com/settings/tokens/new" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              github.com/settings/tokens
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
