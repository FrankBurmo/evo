import React from 'react';

function RepositoryCard({ repoData }) {
  const { repo, insights, recommendations } = repoData;

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
          <div key={index} className={`recommendation priority-${rec.priority}`}>
            <div className="rec-header">
              <span className="rec-title">{rec.title}</span>
              <span className="rec-priority">{rec.priority}</span>
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
    </div>
  );
}

export default RepositoryCard;
