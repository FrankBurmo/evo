import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RepositoryCard from '../components/RepositoryCard';

const mockRepoData = {
  repo: {
    name: 'test-repo',
    fullName: 'user/test-repo',
    description: 'En testbeskrivelse',
    url: 'https://github.com/user/test-repo',
    language: 'JavaScript',
    stars: 42,
    forks: 5,
    openIssues: 3,
    updatedAt: new Date().toISOString(),
    visibility: 'public',
    license: 'MIT',
    projectType: 'web-app',
  },
  insights: null,
  deepInsights: null,
  recommendations: [
    {
      type: 'documentation',
      priority: 'high',
      title: 'Legg til README',
      description: 'Repositoryet mangler README.',
      marketOpportunity: 'README er viktig for adopsjon.',
    },
    {
      type: 'testing',
      priority: 'medium',
      title: 'Legg til tester',
      description: 'Ingen tester funnet.',
    },
  ],
};

function renderCard(repoData = mockRepoData) {
  return render(
    <MemoryRouter>
      <RepositoryCard repoData={repoData} token="ghp_test" />
    </MemoryRouter>,
  );
}

describe('RepositoryCard', () => {
  it('viser repo-navn som lenke', () => {
    renderCard();
    const link = screen.getByText('test-repo');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/user/test-repo');
  });

  it('viser prosjekttype-badge', () => {
    renderCard();
    expect(screen.getByText('🌐 Web-app')).toBeInTheDocument();
  });

  it('viser beskrivelse', () => {
    renderCard();
    expect(screen.getByText('En testbeskrivelse')).toBeInTheDocument();
  });

  it('viser metadata (språk, stjerner, forks, issues)', () => {
    renderCard();
    expect(screen.getByText('📝 JavaScript')).toBeInTheDocument();
    expect(screen.getByText('⭐ 42')).toBeInTheDocument();
    expect(screen.getByText('🔀 5')).toBeInTheDocument();
    expect(screen.getByText('🐛 3 issues')).toBeInTheDocument();
  });

  it('viser synlighet', () => {
    renderCard();
    expect(screen.getByText('🌍 Offentlig')).toBeInTheDocument();
  });

  it('viser anbefalinger med riktig antall', () => {
    renderCard();
    expect(screen.getByText('💡 Anbefalinger (2)')).toBeInTheDocument();
    expect(screen.getByText('Legg til README')).toBeInTheDocument();
    expect(screen.getByText('Legg til tester')).toBeInTheDocument();
  });

  it('viser markedsmulighet for anbefalinger som har det', () => {
    renderCard();
    expect(screen.getByText(/README er viktig for adopsjon/)).toBeInTheDocument();
  });

  it('viser privat-badge for private repos', () => {
    renderCard({ ...mockRepoData, repo: { ...mockRepoData.repo, visibility: 'private' } });
    expect(screen.getByText('🔒 Privat')).toBeInTheDocument();
  });

  it('viser riktig prosjekttype for Android', () => {
    renderCard({ ...mockRepoData, repo: { ...mockRepoData.repo, projectType: 'android-app' } });
    expect(screen.getByText('📱 Android')).toBeInTheDocument();
  });

  it('viser riktig prosjekttype for API', () => {
    renderCard({ ...mockRepoData, repo: { ...mockRepoData.repo, projectType: 'api' } });
    expect(screen.getByText('⚙️ API')).toBeInTheDocument();
  });

  it('skjuler issues-teller når det er 0 issues', () => {
    renderCard({ ...mockRepoData, repo: { ...mockRepoData.repo, openIssues: 0 } });
    expect(screen.queryByText(/issues/)).not.toBeInTheDocument();
  });

  it('viser kodestruktur-innsikt når metrics finnes', () => {
    const withMetrics = {
      ...mockRepoData,
      deepInsights: {
        hasTypeScript: true,
        hasLinter: true,
        hasCI: true,
        fileTreeMetrics: {
          totalFiles: 50,
          totalDirs: 10,
          totalCodeSize: 102400,
          byCategory: { code: 30, docs: 5, config: 8, styles: 5, images: 2, other: 0 },
          testFileCount: 5,
          topExtensions: [{ ext: '.js', count: 20 }],
          topLevelDirs: ['src', 'public'],
          maxDepth: 4,
          sourceDirs: ['src'],
        },
      },
    };
    renderCard(withMetrics);
    expect(screen.getByText('📊 Kodestruktur')).toBeInTheDocument();
    expect(screen.getByText('30 kodefiler')).toBeInTheDocument();
    expect(screen.getByText('🧪 5 tester')).toBeInTheDocument();
  });

  it('viser Se analysedetaljer-lenke', () => {
    renderCard();
    const detailLink = screen.getByRole('link', { name: /fullstendig analyse/i });
    expect(detailLink).toBeInTheDocument();
    expect(detailLink).toHaveAttribute('href', '/repo/user/test-repo');
  });
});
