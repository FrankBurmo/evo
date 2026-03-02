import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import Header from './Header';
import RepositoryCard from './RepositoryCard';
import SkeletonCard from './SkeletonCard';
import ConfigurablePanel from './ConfigurablePanel';
import {
  GUARDRAILS_CONFIG,
  PRODUCT_DEV_CONFIG,
  ENGINEERING_VELOCITY_CONFIG,
} from './panelConfigs';
import ScanControl from './ScanControl';
import type { RepoData } from '../types';

/** Terskel for å bruke virtualisert liste i stedet for CSS-grid. */
const VIRTUALIZE_THRESHOLD = 12;
/** Fast høyde per repo-kort i virtualisert liste (px). */
const ITEM_HEIGHT = 520;
/** Minimumsbredde per kort (tilsvarer CSS minmax(360px, 1fr)). */
const CARD_MIN_WIDTH = 360;
/** Mellomrom mellom kort (px). */
const GRID_GAP = 16;

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

function Dashboard({ token, onLogout }: DashboardProps): React.JSX.Element {
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    void fetchRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/repos', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = (await response.json()) as { repositories?: RepoData[] };
      setRepos(data.repositories ?? []);
    } catch (err: unknown) {
      setError(
        'Failed to load repositories: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalRepos = repos.length;
    const activeRepos = repos.filter((r) => r.insights?.recentActivity).length;
    const totalStars = repos.reduce((sum, r) => sum + (r.repo.stars || 0), 0);
    const needsAttention = repos.filter((r) =>
      r.recommendations.some((rec) => rec.priority === 'high'),
    ).length;
    return { totalRepos, activeRepos, totalStars, needsAttention };
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let result = repos;

    // Kategorifilter
    if (filter === 'market-opportunities') {
      result = result.filter((repo) =>
        repo.recommendations.some((rec) => rec.marketOpportunity),
      );
    } else if (filter === 'needs-attention') {
      result = result.filter((repo) =>
        repo.recommendations.some((rec) => rec.priority === 'high'),
      );
    } else if (filter === 'active') {
      result = result.filter((repo) => repo.insights?.recentActivity);
    } else if (filter === 'inactive') {
      result = result.filter((repo) => !repo.insights?.recentActivity);
    }

    // Søk
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (repo) =>
          repo.repo.name.toLowerCase().includes(q) ||
          repo.repo.fullName.toLowerCase().includes(q) ||
          (repo.repo.description || '').toLowerCase().includes(q),
      );
    }

    // Sortering
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'stars':
          cmp = (a.repo.stars || 0) - (b.repo.stars || 0);
          break;
        case 'updated':
          cmp =
            new Date(a.repo.updatedAt).getTime() -
            new Date(b.repo.updatedAt).getTime();
          break;
        case 'priority': {
          const score = (r: RepoData) =>
            r.recommendations.filter((rec) => rec.priority === 'high').length;
          cmp = score(a) - score(b);
          break;
        }
        case 'name':
        default:
          cmp = a.repo.name.localeCompare(b.repo.name);
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [repos, filter, searchQuery, sortBy, sortOrder]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  if (isLoading) {
    return (
      <div className="app">
        <Header onLogout={onLogout} />
        <div
          className="repos-grid"
          aria-busy="true"
          aria-label="Laster repositories"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <Header onLogout={onLogout} />
        <div
          className="error"
          role="alert"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>Feil oppstod</h3>
          <p style={{ fontSize: '0.88rem' }}>{error}</p>
          <button
            onClick={onLogout}
            className="btn-secondary"
            style={{ marginTop: '14px' }}
          >
            Logg ut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header onLogout={onLogout} showActions />

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

      <ScanControl token={token} />

      <ConfigurablePanel repos={repos} token={token} {...GUARDRAILS_CONFIG} />

      <ConfigurablePanel repos={repos} token={token} {...PRODUCT_DEV_CONFIG} />

      <ConfigurablePanel
        repos={repos}
        token={token}
        {...ENGINEERING_VELOCITY_CONFIG}
      />

      <div className="filters">
        <h3>Filtrer repositories</h3>
        <div className="filter-controls">
          <div
            className="filter-options"
            role="group"
            aria-label="Filtrer etter kategori"
          >
            <button
              className={`filter-option ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
            >
              Alle ({repos.length})
            </button>
            <button
              className={`filter-option ${filter === 'market-opportunities' ? 'active' : ''}`}
              onClick={() => setFilter('market-opportunities')}
              aria-pressed={filter === 'market-opportunities'}
            >
              💡 Markedsmuligheter
            </button>
            <button
              className={`filter-option ${filter === 'needs-attention' ? 'active' : ''}`}
              onClick={() => setFilter('needs-attention')}
              aria-pressed={filter === 'needs-attention'}
            >
              ⚠️ Trenger oppmerksomhet
            </button>
            <button
              className={`filter-option ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
              aria-pressed={filter === 'active'}
            >
              ✅ Aktive
            </button>
            <button
              className={`filter-option ${filter === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilter('inactive')}
              aria-pressed={filter === 'inactive'}
            >
              💤 Inaktive
            </button>
          </div>
          <div className="filter-search-sort">
            <div className="filter-search">
              <label htmlFor="repo-search" className="sr-only">
                Søk i repositories
              </label>
              <input
                id="repo-search"
                type="search"
                className="filter-search-input"
                placeholder="🔍 Søk etter navn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-sort">
              <label htmlFor="repo-sort" className="sr-only">
                Sorter etter
              </label>
              <select
                id="repo-sort"
                className="filter-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Navn</option>
                <option value="stars">Stjerner</option>
                <option value="updated">Sist oppdatert</option>
                <option value="priority">Prioritet</option>
              </select>
              <button
                className="filter-sort-order"
                onClick={toggleSortOrder}
                aria-label={
                  sortOrder === 'asc' ? 'Stigende rekkefølge' : 'Synkende rekkefølge'
                }
                title={sortOrder === 'asc' ? 'Stigende' : 'Synkende'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {filteredRepos.length} repositories funnet
      </div>

      {filteredRepos.length === 0 ? (
        <div className="no-repos">Ingen repositories funnet med valgt filter.</div>
      ) : filteredRepos.length > VIRTUALIZE_THRESHOLD ? (
        /* Virtualisert liste for store samlinger (> 12 repos) */
        <div className="repos-list-virtual" style={{ height: '80vh' }}>
          <AutoSizer
            renderProp={({ width, height }) => {
              if (!width || !height) return null;
              const columnCount = Math.max(1, Math.floor((width + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
              const rowCount = Math.ceil(filteredRepos.length / columnCount);
              const rowHeight = ITEM_HEIGHT + GRID_GAP;
              type RowData = { repos: RepoData[]; columnCount: number; token: string };
              const rowData: RowData = { repos: filteredRepos, columnCount, token };
              return (
                <FixedSizeList<RowData>
                  height={height}
                  width={width}
                  itemCount={rowCount}
                  itemSize={rowHeight}
                  itemData={rowData}
                >
                  {({ index, style, data }: ListChildComponentProps<RowData>) => {
                    const { repos, columnCount: cols, token: t } = data;
                    const startIdx = index * cols;
                    const rowItems = repos.slice(startIdx, startIdx + cols);
                    return (
                      <div
                        style={{
                          ...style,
                          display: 'grid',
                          gridTemplateColumns: `repeat(${cols}, 1fr)`,
                          gap: GRID_GAP,
                          paddingBottom: GRID_GAP,
                          boxSizing: 'border-box',
                        }}
                      >
                        {rowItems.map((repoData) => (
                          <RepositoryCard
                            key={repoData.repo.fullName}
                            repoData={repoData}
                            token={t}
                          />
                        ))}
                        {Array.from({ length: cols - rowItems.length }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                      </div>
                    );
                  }}
                </FixedSizeList>
              );
            }}
          />
        </div>
      ) : (
        /* Normalt CSS-grid for mindre samlinger */
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
