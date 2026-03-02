import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RepoDetailPage from '../pages/RepoDetailPage';

const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

const mockRepoData = {
  repo: {
    name: 'test-repo',
    fullName: 'user/test-repo',
    description: 'Testbeskrivelse',
    url: 'https://github.com/user/test-repo',
    language: 'TypeScript',
    stars: 10,
    forks: 2,
    openIssues: 0,
    updatedAt: new Date().toISOString(),
    visibility: 'public',
    projectType: 'web-app',
  },
  insights: { recentActivity: true },
  deepInsights: null,
  recommendations: [
    { title: 'Legg til tester', priority: 'high', type: 'testing', description: 'Ingen tester' },
  ],
};

function renderDetailPage(path = '/repo/user/test-repo') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/repo/:owner/:name"
          element={<RepoDetailPage token="ghp_test" onLogout={() => {}} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RepoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('viser laste-status mens data hentes', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderDetailPage();
    expect(screen.getByText('Laster repo-data...')).toBeInTheDocument();
  });

  it('viser repo-data etter vellykket fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRepoData),
    });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });
  });

  it('viser breadcrumb med tilbake-lenke', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRepoData),
    });
    renderDetailPage();
    await waitFor(() => {
      const backLink = screen.getByText('← Tilbake til dashbord');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });
  });

  it('viser repo-navn i breadcrumb', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRepoData),
    });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('user/test-repo')).toBeInTheDocument();
    });
  });

  it('viser feilmelding ved mislykket fetch', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('sender Authorization-header ved fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRepoData),
    });
    renderDetailPage();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/repo/user/test-repo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer ghp_test' },
        }),
      );
    });
  });
});
