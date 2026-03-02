import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/Header';

describe('Header', () => {
  beforeEach(() => {
    // Nullstill data-theme mellom tester
    document.documentElement.removeAttribute('data-theme');
  });

  it('viser appnavn og undertekst', () => {
    render(<Header onLogout={() => {}} />);
    expect(screen.getByText('Evo')).toBeInTheDocument();
    expect(screen.getByText(/vokser kontinuerlig/)).toBeInTheDocument();
  });

  it('viser ikke logg-ut-knapp uten showActions', () => {
    render(<Header onLogout={() => {}} />);
    expect(screen.queryByText('Logg ut')).not.toBeInTheDocument();
  });

  it('viser logg-ut-knapp og live-status med showActions', () => {
    render(<Header onLogout={() => {}} showActions />);
    expect(screen.getByText('Logg ut')).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
  });

  it('kaller onLogout ved klikk på logg-ut', () => {
    const onLogout = vi.fn();
    render(<Header onLogout={onLogout} showActions />);
    screen.getByText('Logg ut').click();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('har banner-rolle', () => {
    render(<Header onLogout={() => {}} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('viser tema-veksler-knapp', () => {
    render(<Header onLogout={() => {}} />);
    const themeBtn = screen.getByRole('button', { name: /tema/i });
    expect(themeBtn).toBeInTheDocument();
  });

  it('veksler tema ved klikk på tema-knapp', () => {
    render(<Header onLogout={() => {}} />);
    const themeBtn = screen.getByRole('button', { name: /tema/i });
    // Standard er mørkt tema — knappen tilbyr lyst tema
    expect(themeBtn).toHaveAttribute('aria-label', 'Bytt til lyst tema');
    fireEvent.click(themeBtn);
    // Etter klikk skal knappen tilby mørkt tema
    expect(themeBtn).toHaveAttribute('aria-label', 'Bytt til mørkt tema');
  });

  it('viser hamburger-knapp (mobilmeny)', () => {
    render(<Header onLogout={() => {}} />);
    const menuBtn = screen.getByRole('button', { name: /meny/i });
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('åpner/lukker mobilmeny ved klikk på hamburger', () => {
    render(<Header onLogout={() => {}} showActions />);
    const menuBtn = screen.getByRole('button', { name: /meny/i });
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });
});

