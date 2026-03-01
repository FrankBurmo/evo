import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../components/Header';

describe('Header', () => {
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
});
