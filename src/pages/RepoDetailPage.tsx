import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import RepositoryCard from '../components/RepositoryCard';
import type { RepoData } from '../types';

interface RepoDetailPageProps {
  token: string;
  onLogout: () => void;
}

/**
 * RepoDetailPage — dedikert side for ett repository.
 *
 * Route: /repo/:owner/:name
 * Henter analyse-data fra GET /api/repo/:owner/:name og viser
 * fullt repo-kort med alle anbefalinger.
 */
function RepoDetailPage({ token, onLogout }: RepoDetailPageProps): React.JSX.Element {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!owner || !name) return;
    void fetchRepo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, name]);

  const fetchRepo = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/repo/${owner}/${name}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Klarte ikke hente repo-data (${response.status})`);
      }
      const data = (await response.json()) as RepoData;
      setRepoData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header onLogout={onLogout} showActions />

      <nav className="breadcrumb" aria-label="Navigasjon">
        <Link to="/" className="breadcrumb-link">
          ← Tilbake til dashbord
        </Link>
        {owner && name && (
          <span className="breadcrumb-current" aria-current="page">
            {owner}/{name}
          </span>
        )}
      </nav>

      {isLoading && (
        <div className="loading-text" role="status" aria-live="polite">
          Laster repo-data...
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {repoData && !isLoading && (
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <RepositoryCard repoData={repoData} token={token} />
        </div>
      )}
    </div>
  );
}

export default RepoDetailPage;
