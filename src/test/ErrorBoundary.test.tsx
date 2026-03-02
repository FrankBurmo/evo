import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Komponent som kaster feil i render
function BrokenComponent() {
  throw new Error('Test-feil');
}

function WorkingComponent() {
  return <p>Alt fungerer</p>;
}

describe('ErrorBoundary', () => {
  // Undertrykk console.error fra React + ErrorBoundary
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rendrer barn normalt uten feil', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Alt fungerer')).toBeInTheDocument();
  });

  it('viser feilmelding når barn kaster feil', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('⚠️ Noe gikk galt')).toBeInTheDocument();
    expect(screen.getByText('Test-feil')).toBeInTheDocument();
  });

  it('har alert-rolle ved feil', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('viser last-inn-knapp ved feil', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Last inn på nytt')).toBeInTheDocument();
  });
});
