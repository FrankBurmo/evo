import React, { useState, useEffect, useRef } from 'react';

function AgentModal({ recommendation, repo, token, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [issueUrl, setIssueUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Fokus-felle, Escape-lukking og fokus-retur
  useEffect(() => {
    previousFocusRef.current = document.activeElement;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = modal.querySelector(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = modal.querySelectorAll(focusableSelector);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const handleConfirm = async () => {
    setStatus('loading');
    try {
      const [owner, repoName] = repo.fullName.split('/');
      const response = await fetch('/api/create-agent-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner,
          repo: repoName,
          recommendation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Noe gikk galt');
      }

      setIssueUrl(data.issueUrl);
      setStatus('success');
      if (data.note) setErrorMessage(data.note);
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-modal-title"
      >
        <div className="modal-header">
          <h2 id="agent-modal-title">🤖 La Copilot fikse dette?</h2>
          <button className="modal-close" onClick={onClose} aria-label="Lukk dialog">✕</button>
        </div>

        {status === 'idle' && (
          <>
            <div className="modal-body">
              <p className="modal-repo-name">📁 {repo.fullName}</p>
              <div className={`modal-issue recommendation priority-${recommendation.priority}`}>
                <div className="rec-header">
                  <span className="rec-title">{recommendation.title}</span>
                  <span className="rec-priority">{recommendation.priority}</span>
                </div>
                <div className="rec-description">{recommendation.description}</div>
                {recommendation.marketOpportunity && (
                  <div className="rec-opportunity">
                    💼 {recommendation.marketOpportunity}
                  </div>
                )}
              </div>
              <p className="modal-confirm-text">
                Dette vil opprette et GitHub issue med problembeskrivelsen og automatisk
                tildele det til <strong>Copilot</strong>, slik at agenten starter å jobbe
                med det umiddelbart.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Avbryt</button>
              <button className="btn-primary" onClick={handleConfirm}>
                🚀 Ja, la Copilot fikse det!
              </button>
            </div>
          </>
        )}

        {status === 'loading' && (
          <div className="modal-body modal-status">
            <div className="spinner" />
            <p>Oppretter issue og tildeler til Copilot...</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="modal-body modal-status">
              <div className="status-icon success">✅</div>
              <h3>Issue opprettet!</h3>
              <p>Copilot er nå tildelt og vil begynne å jobbe med problemet.</p>
              {errorMessage && (
                <p style={{ marginTop: '10px', fontSize: '0.82rem', color: '#e67e00', background: '#fff8ee', padding: '10px', borderRadius: '6px', lineHeight: 1.5 }}>
                  ⚠️ {errorMessage}
                </p>
              )}
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="issue-link"
              >
                🔗 Åpne issue på GitHub
              </a>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="modal-body modal-status">
              <div className="status-icon error">❌</div>
              <h3>Noe gikk galt</h3>
              <p>{errorMessage}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Avbryt</button>
              <button className="btn-primary" onClick={() => setStatus('idle')}>
                Prøv igjen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AgentModal;
