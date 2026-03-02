import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

// Mock fetch globalt
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRepos = [
  {
    repo: {
      name: 'repo-a',
      fullName: 'user/repo-a',
      description: 'Et JavaScript-prosjekt',
      url: 'https://github.com/user/repo-a',
      language: 'JavaScript',
      stars: 10,
      forks: 2,
      openIssues: 1,
      updatedAt: new Date().toISOString(),
      visibility: 'public',
      license: 'MIT',
      projectType: 'web-app',
      projectTypeLabel: '🌐 Web-app',
    },
    insights: { recentActivity: true },
    recommendations: [
      { title: 'Legg til tester', priority: 'high', type: 'testing', description: 'Mangler tester' },
    ],
  },
  {
    repo: {
      name: 'repo-b',
      fullName: 'user/repo-b',
      description: 'En Python-API',
      url: 'https://github.com/user/repo-b',
      language: 'Python',
      stars: 50,
      forks: 10,
      openIssues: 0,
      updatedAt: new Date(Date.now() - 200 * 86400000).toISOString(),
      visibility: 'public',
      license: null,
      projectType: 'api',
      projectTypeLabel: '⚙️ API',
    },
    insights: { recentActivity: false },
    recommendations: [],
  },
];

describe('Dashboard', () => {
  const onLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  function renderWithFetch(repos = mockRepos) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ totalRepos: repos.length, repositories: repos }),
    });
    return render(
      <MemoryRouter>
        <Dashboard token="ghp_test" onLogout={onLogout} />
      </MemoryRouter>,
    );
  }

  it('viser skeleton-loading initielt', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // henger
    render(
      <MemoryRouter>
        <Dashboard token="ghp_test" onLogout={onLogout} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Laster repositories')).toBeInTheDocument();
  });

  it('viser repo-kort etter vellykket lasting', async () => {
    renderWithFetch();
    await waitFor(() => {
      expect(screen.getByText('repo-a')).toBeInTheDocument();
    });
    expect(screen.getByText('repo-b')).toBeInTheDocument();
  });

  it('viser statistikk', async () => {
    renderWithFetch();
    await waitFor(() => {
      expect(screen.getByText('repo-a')).toBeInTheDocument();
    });
    // Totalt 2 repos, 60 stjerner, 1 trenger oppmerksomhet
    expect(screen.getByText('2')).toBeInTheDocument(); // total repos
  });

  it('viser feilmelding ved nettverksfeil', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Nettverksfeil'));
    render(
      <MemoryRouter>
        <Dashboard token="ghp_test" onLogout={onLogout} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });
  });

  it('søkefelt filtrerer repos', async () => {
    renderWithFetch();
    await waitFor(() => {
      expect(screen.getByText('repo-a')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/søk/i);
    fireEvent.change(searchInput, { target: { value: 'python' } });

    expect(screen.queryByText('repo-a')).not.toBeInTheDocument();
    expect(screen.getByText('repo-b')).toBeInTheDocument();
  });

  it('sender Authorization-header i fetch-kall', async () => {
    renderWithFetch();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/repos', {
        headers: { Authorization: 'Bearer ghp_test' },
      });
    });
  });
});
