import React, { useState } from 'react';
import AgentModal from './AgentModal';

function RepositoryCard({ repoData, token }) {
  const { repo, insights, recommendations } = repoData;
  const [selectedRec, setSelectedRec] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I går';
    if (diffDays < 30) return `${diffDays} dager siden`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} måneder siden`;
    return `${Math.floor(diffDays / 365)} år siden`;
  };

  return (
    <div className="repo-card">
      <div className="repo-header">
        <h3>
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            {repo.name}
          </a>
        </h3>
        {repo.description && <p>{repo.description}</p>}
      </div>

      <div className="repo-meta">
        {repo.language && <span>📝 {repo.language}</span>}
        <span>⭐ {repo.stars}</span>
        <span>🔀 {repo.forks}</span>
        {repo.openIssues > 0 && <span>🐛 {repo.openIssues} issues</span>}
      </div>

      <div className="repo-meta">
        <span>🕒 Oppdatert {formatDate(repo.updatedAt)}</span>
        <span>
          {repo.visibility === 'private' ? '🔒 Privat' : '🌍 Offentlig'}
        </span>
      </div>

      <div className="recommendations">
        <h4>💡 Anbefalinger ({recommendations.length})</h4>
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`recommendation priority-${rec.priority} recommendation-clickable`}
            onClick={() => rec.priority !== 'info' && setSelectedRec(rec)}
            title={rec.priority !== 'info' ? 'Klikk for å la Copilot fikse dette' : ''}
          >
            <div className="rec-header">
              <span className="rec-title">{rec.title}</span>
              <div className="rec-header-right">
                <span className="rec-priority">{rec.priority}</span>
                {rec.priority !== 'info' && (
                  <span className="rec-agent-hint">🤖 Fix med Copilot</span>
                )}
              </div>
            </div>
            <div className="rec-description">{rec.description}</div>
            {rec.marketOpportunity && (
              <div className="rec-opportunity">
                💼 Markedsmulighet: {rec.marketOpportunity}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedRec && (
        <AgentModal
          recommendation={selectedRec}
          repo={repo}
          token={token}
          onClose={() => setSelectedRec(null)}
        />
      )}
    </div>
  );
}

export default RepositoryCard;
