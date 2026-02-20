import React, { useState, useEffect, useCallback } from 'react';
import RepositoryCard from './RepositoryCard';
import GuardrailsPanel from './GuardrailsPanel';
import ProductDevelopmentPanel from './ProductDevelopmentPanel';
import EngineeringVelocityPanel from './EngineeringVelocityPanel';

function Dashboard({ token, onLogout }) {
  const [repos, setRepos] = useState([]);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchRepositories = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/repos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();
      setRepos(data.repositories || []);
    } catch (err) {
      setError('Failed to load repositories: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    applyFilter();
  }, [repos, filter]);

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRepos(repos);
    } else if (filter === 'market-opportunities') {
      setFilteredRepos(repos.filter(repo => 
        repo.recommendations.some(rec => rec.marketOpportunity)
      ));
    } else if (filter === 'needs-attention') {
      setFilteredRepos(repos.filter(repo => 
        repo.recommendations.some(rec => rec.priority === 'high')
      ));
    } else if (filter === 'active') {
      setFilteredRepos(repos.filter(repo => repo.insights.recentActivity));
    } else if (filter === 'inactive') {
      setFilteredRepos(repos.filter(repo => !repo.insights.recentActivity));
    }
  };

  const calculateStats = () => {
    const totalRepos = repos.length;
    const activeRepos = repos.filter(r => r.insights.recentActivity).length;
    const totalStars = repos.reduce((sum, r) => sum + (r.repo.stars || 0), 0);
    const needsAttention = repos.filter(r => 
      r.recommendations.some(rec => rec.priority === 'high')
    ).length;

    return { totalRepos, activeRepos, totalStars, needsAttention };
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-brand">
            <div className="header-logo">⚡</div>
            <div className="header-title">
              <h1>Product Orchestrator</h1>
              <p>AI-drevet repository-analyse</p>
            </div>
          </div>
        </div>
        <div className="loading">
          Laster repositories...
          <div className="loading-bar" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-brand">
            <div className="header-logo">⚡</div>
            <div className="header-title">
              <h1>Product Orchestrator</h1>
              <p>AI-drevet repository-analyse</p>
            </div>
          </div>
        </div>
        <div className="error" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>Feil oppstod</h3>
          <p style={{ fontSize: '0.88rem' }}>{error}</p>
          <button onClick={onLogout} style={{ marginTop: '14px', padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'inherit', cursor: 'pointer', fontSize: '0.87rem' }}>Logg ut</button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="app">
      <div className="header">
        <div className="header-brand">
          <div className="header-logo">⚡</div>
          <div className="header-title">
            <h1>Product Orchestrator</h1>
            <p>Analyser og optimaliser dine GitHub repositories</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="status-dot">live</span>
          <button
            onClick={onLogout}
            style={{
              padding: '7px 16px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}
          >
            Logg ut
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-item">
          <div className="stat-value">{stats.totalRepos}</div>
          <div className="stat-label">Totalt repositories</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.activeRepos}</div>
          <div className="stat-label">Aktive siste 30 dager</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalStars}</div>
          <div className="stat-label">Totalt stjerner</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.needsAttention}</div>
          <div className="stat-label">Trenger oppmerksomhet</div>
        </div>
      </div>

      <GuardrailsPanel repos={repos} token={token} />

      <ProductDevelopmentPanel repos={repos} token={token} />

      <EngineeringVelocityPanel repos={repos} token={token} />

      <div className="filters">
        <h3>Filtrer repositories</h3>
        <div className="filter-options">
          <div 
            className={`filter-option ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Alle ({repos.length})
          </div>
          <div 
            className={`filter-option ${filter === 'market-opportunities' ? 'active' : ''}`}
            onClick={() => setFilter('market-opportunities')}
          >
            💡 Markedsmuligheter
          </div>
          <div 
            className={`filter-option ${filter === 'needs-attention' ? 'active' : ''}`}
            onClick={() => setFilter('needs-attention')}
          >
            ⚠️ Trenger oppmerksomhet
          </div>
          <div 
            className={`filter-option ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            ✅ Aktive
          </div>
          <div 
            className={`filter-option ${filter === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilter('inactive')}
          >
            💤 Inaktive
          </div>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div className="no-repos">
          Ingen repositories funnet med valgt filter.
        </div>
      ) : (
        <div className="repos-grid">
          {filteredRepos.map((repoData) => (
            <RepositoryCard 
              key={repoData.repo.fullName} 
              repoData={repoData}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
