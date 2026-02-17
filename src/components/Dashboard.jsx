import React, { useState, useEffect } from 'react';
import RepositoryCard from './RepositoryCard';
import GuardrailsPanel from './GuardrailsPanel';

function Dashboard({ token, onLogout }) {
  const [repos, setRepos] = useState([]);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [repos, filter]);

  const fetchRepositories = async () => {
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
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRepos(repos);
    } else if (filter === 'market-opportunities') {
      // Filter repos that have market opportunity recommendations
      setFilteredRepos(repos.filter(repo => 
        repo.recommendations.some(rec => rec.marketOpportunity)
      ));
    } else if (filter === 'needs-attention') {
      // Filter repos with high priority recommendations
      setFilteredRepos(repos.filter(repo => 
        repo.recommendations.some(rec => rec.priority === 'high')
      ));
    } else if (filter === 'active') {
      // Filter repos with recent activity
      setFilteredRepos(repos.filter(repo => repo.insights.recentActivity));
    } else if (filter === 'inactive') {
      // Filter repos without recent activity
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
          <h1>🚀 Product Orchestrator</h1>
        </div>
        <div className="loading">Laster repositories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="header">
          <h1>🚀 Product Orchestrator</h1>
        </div>
        <div className="error">
          <h3>Feil oppstod</h3>
          <p>{error}</p>
          <button onClick={onLogout} style={{ marginTop: '10px' }}>Logg ut</button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="app">
      <div className="header">
        <h1>🚀 Product Orchestrator</h1>
        <p>Analyser og optimaliser dine GitHub repositories</p>
        <button 
          onClick={onLogout} 
          style={{ 
            marginTop: '10px', 
            padding: '8px 20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logg ut
        </button>
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

      <div className="filters">
        <h3>📊 Filtrer repositories</h3>
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
