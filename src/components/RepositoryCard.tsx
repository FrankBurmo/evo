import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import AgentModal from './AgentModal';
import type { RepoData, Recommendation } from '../types';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  'web-app': '🌐 Web-app',
  'android-app': '📱 Android',
  api: '⚙️ API',
  library: '📦 Bibliotek',
  docs: '📚 Dokumentasjon',
  other: '📁 Annet',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formater dato relativt til nå — definert utenfor komponenten for å unngå re-opprettelse. */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 30) return `${diffDays} dager siden`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} måneder siden`;
  return `${Math.floor(diffDays / 365)} år siden`;
}

interface RepositoryCardProps {
  repoData: RepoData;
  token: string;
}

const RepositoryCard = memo(function RepositoryCard({
  repoData,
  token,
}: RepositoryCardProps): React.JSX.Element {
  const { repo, deepInsights, recommendations } = repoData;
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [showCodeInsights, setShowCodeInsights] = useState(false);

  const metrics = deepInsights?.fileTreeMetrics;

  return (
    <div className="repo-card">
      <div className="repo-header">
        <h3>
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            {repo.name}
          </a>
          {repo.projectType && (
            <span className="repo-project-type">
              {PROJECT_TYPE_LABELS[repo.projectType] ?? repo.projectType}
            </span>
          )}
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
        <span>{repo.visibility === 'private' ? '🔒 Privat' : '🌍 Offentlig'}</span>
      </div>

      {/* Kodestruktur-innsikt */}
      {metrics && (
        <div className="code-insights">
          <button
            className="code-insights-toggle"
            onClick={() => setShowCodeInsights(!showCodeInsights)}
            aria-expanded={showCodeInsights}
          >
            <span className="code-insights-label">📊 Kodestruktur</span>
            <span className="toggle-icon" aria-hidden="true">
              {showCodeInsights ? '▲' : '▼'}
            </span>
          </button>

          <div className="code-insights-summary">
            <span title="Kodefiler">{metrics.byCategory['code'] ?? 0} kodefiler</span>
            <span title="Total kodestørrelse">{formatBytes(metrics.totalCodeSize)}</span>
            <span title="Testfiler">🧪 {metrics.testFileCount} tester</span>
            <span title="Totalt filer">{metrics.totalFiles} filer</span>
          </div>

          {showCodeInsights && (
            <div className="code-insights-details">
              {/* Filtype-fordeling */}
              <div className="insight-row">
                <span className="insight-label">Filkategorier:</span>
                <div className="insight-bar-chart">
                  {Object.entries(metrics.byCategory)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <div key={cat} className="bar-item" title={`${cat}: ${count} filer`}>
                        <div
                          className={`bar bar-${cat}`}
                          style={{
                            width: `${Math.max(8, (count / metrics.totalFiles) * 100)}%`,
                          }}
                        />
                        <span className="bar-label">
                          {cat} ({count})
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Topp filtyper */}
              {metrics.topExtensions.length > 0 && (
                <div className="insight-row">
                  <span className="insight-label">Topp filtyper:</span>
                  <div className="insight-tags">
                    {metrics.topExtensions.slice(0, 6).map(({ ext, count }) => (
                      <span key={ext} className="insight-tag">
                        {ext || '(uten)'} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mappestruktur */}
              {metrics.topLevelDirs.length > 0 && (
                <div className="insight-row">
                  <span className="insight-label">Toppnivå-mapper:</span>
                  <div className="insight-tags">
                    {metrics.topLevelDirs.map((dir) => (
                      <span key={dir} className="insight-tag insight-tag-dir">
                        📁 {dir}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verktøy-badges */}
              {deepInsights && (
                <div className="insight-row">
                  <span className="insight-label">Verktøy:</span>
                  <div className="insight-tags">
                    {deepInsights.hasTypeScript && (
                      <span className="insight-badge badge-ts">TS</span>
                    )}
                    {deepInsights.hasLinter && (
                      <span className="insight-badge badge-lint">Linter</span>
                    )}
                    {deepInsights.hasFormatter && (
                      <span className="insight-badge badge-fmt">Formatter</span>
                    )}
                    {deepInsights.hasDocker && (
                      <span className="insight-badge badge-docker">Docker</span>
                    )}
                    {deepInsights.hasCI && (
                      <span className="insight-badge badge-ci">CI/CD</span>
                    )}
                    {deepInsights.hasDependabot && (
                      <span className="insight-badge badge-dep">Dependabot</span>
                    )}
                    {deepInsights.hasLockfile && (
                      <span className="insight-badge badge-lock">Lockfile</span>
                    )}
                    {!deepInsights.hasTypeScript &&
                      !deepInsights.hasLinter &&
                      !deepInsights.hasCI && (
                        <span className="insight-badge badge-none">
                          Ingen verktøy oppdaget
                        </span>
                      )}
                  </div>
                </div>
              )}

              {/* Mappenivå */}
              <div className="insight-row">
                <span className="insight-label">Mappenivå:</span>
                <span className="insight-value">
                  {metrics.maxDepth} nivåer, {metrics.totalDirs} mapper
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="recommendations">
        <h4>💡 Anbefalinger ({recommendations.length})</h4>
        {recommendations.map((rec, index) => (
          <button
            key={index}
            type="button"
            className={`recommendation priority-${rec.priority} recommendation-clickable`}
            onClick={() => rec.priority !== 'info' && setSelectedRec(rec)}
            title={rec.priority !== 'info' ? 'Klikk for å la Copilot fikse dette' : ''}
            disabled={rec.priority === 'info'}
          >
            <span className="rec-header">
              <span className="rec-title">
                {rec.source === 'ai' && <span className="rec-ai-badge">KI</span>}
                {rec.title}
              </span>
              <span className="rec-header-right">
                <span className="rec-priority">{rec.priority}</span>
                {rec.priority !== 'info' && (
                  <span className="rec-agent-hint">🤖 Fix med Copilot</span>
                )}
              </span>
            </span>
            <span className="rec-description">{rec.description}</span>
            {rec.marketOpportunity && (
              <span className="rec-opportunity">
                💼 Markedsmulighet: {rec.marketOpportunity}
              </span>
            )}
          </button>
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

      {/* Lenke til dedikert detaljside */}
      <div className="repo-detail-footer">
        <Link
          to={`/repo/${repo.fullName.split('/')[0]}/${repo.name}`}
          className="repo-detail-link"
          aria-label={`Se fullstendig analyse for ${repo.name}`}
        >
          Se analysedetaljer →
        </Link>
      </div>
    </div>
  );
});

export default RepositoryCard;
