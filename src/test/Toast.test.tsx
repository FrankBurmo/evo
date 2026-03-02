import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/Toast';

// Hjelpekomponent for å teste useToast-hooken
function TestConsumer() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Testmelding', 'success')}>Vis toast</button>
      <button onClick={() => addToast('Feil!', 'error')}>Vis feil</button>
    </div>
  );
}

describe('Toast', () => {
  it('viser toast-melding ved addToast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Vis toast'));
    expect(screen.getByText('Testmelding')).toBeInTheDocument();
  });

  it('viser toast med riktig type-klasse', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Vis feil'));
    const toast = screen.getByText('Feil!').closest('.toast');
    expect(toast).toHaveClass('toast--error');
  });

  it('fjerner toast med lukk-knapp', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Vis toast'));
    expect(screen.getByText('Testmelding')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Lukk notifikasjon'));
    expect(screen.queryByText('Testmelding')).not.toBeInTheDocument();
  });

  it('viser flere toasts samtidig', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Vis toast'));
    fireEvent.click(screen.getByText('Vis feil'));
    expect(screen.getByText('Testmelding')).toBeInTheDocument();
    expect(screen.getByText('Feil!')).toBeInTheDocument();
  });

  it('kaster feil ved bruk av useToast utenfor provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useToast må brukes innenfor ToastProvider');
    spy.mockRestore();
  });
});
