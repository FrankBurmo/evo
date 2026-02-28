import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch globalt
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockFetch.mockReset();
  });

  it('viser autentiseringsskjema når bruker ikke er innlogget', () => {
    render(<App />);
    expect(screen.getByText('Evo')).toBeInTheDocument();
    expect(screen.getByText('Koble til GitHub')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx')).toBeInTheDocument();
  });

  it('viser «Start analyse»-knapp', () => {
    render(<App />);
    expect(screen.getByText('Start analyse →')).toBeInTheDocument();
  });

  it('viser feilmelding ved tomt token', async () => {
    render(<App />);
    const submitBtn = screen.getByText('Start analyse →');
    fireEvent.click(submitBtn);
    expect(screen.getByText('Please enter a GitHub token')).toBeInTheDocument();
  });

  it('laster lagret token fra localStorage og viser Dashboard', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('ghp_testtoken123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ totalRepos: 0, repositories: [] }),
    });

    render(<App />);
    // Når token finnes, bør Dashboard vises (laster-tilstanden)
    expect(screen.getByText('Laster repositories...')).toBeInTheDocument();
  });

  it('logget inn → viser Dashboard etter vellykket autentisering', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true }) // /api/health
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ totalRepos: 0, repositories: [] }),
      }); // /api/repos

    render(<App />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx');
    fireEvent.change(input, { target: { value: 'ghp_testtoken' } });
    fireEvent.click(screen.getByText('Start analyse →'));

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('github_token', 'ghp_testtoken');
    });
  });

  it('viser hjelpe-info med lenke til GitHub Settings', () => {
    render(<App />);
    expect(screen.getByText('Trenger du hjelp?')).toBeInTheDocument();
    expect(screen.getByText('github.com/settings/tokens')).toHaveAttribute(
      'href',
      'https://github.com/settings/tokens/new'
    );
  });
});
