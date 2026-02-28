import React, { useState, useEffect, useRef } from 'react';

function ScanControl({ token }) {
  const [scanStatus, setScanStatus] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, currentRepo: null });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Options
  const [createIssues, setCreateIssues] = useState(false);
  const [assignCopilot, setAssignCopilot] = useState(false);
  const [minPriority, setMinPriority] = useState('medium');
  const [maxRepos, setMaxRepos] = useState(50);

  // Batch issue creation
  const [batchStatus, setBatchStatus] = useState('idle'); // idle | loading | done
  const [batchResult, setBatchResult] = useState(null);

  const pollRef = useRef(null);

  // Poll scan status while running
  useEffect(() => {
    if (scanStatus === 'running') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/scan/status', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await res.json();
          setProgress(data.progress);

          if (data.status === 'completed' || data.status === 'error') {
            setScanStatus(data.status);
            if (data.error) setError(data.error);
            clearInterval(pollRef.current);
            fetchResults();
          }
        } catch {
          // ignore temporary fetch errors
        }
      }, 1500);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scanStatus]);

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/scan/results', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError('Kunne ikke hente resultater: ' + err.message);
    }
  };

  const startScan = async () => {
    setError('');
    setResults(null);
    setBatchStatus('idle');
    setBatchResult(null);
    setScanStatus('running');
    setProgress({ current: 0, total: 0, currentRepo: null });

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ createIssues, assignCopilot, minPriority, maxRepos }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanStatus('error');
        setError(data.error || 'Feil ved start av skanning');
      }
    } catch (err) {
      setScanStatus('error');
      setError('Nettverksfeil: ' + err.message);
    }
  };

  const handleBatchCreateIssues = async () => {
    setBatchStatus('loading');
    setBatchResult(null);
    try {
      const res = await fetch('/api/scan/create-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ assignCopilot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feil');
      setBatchResult(data);
      setBatchStatus('done');
      // Refresh results to show updated issuesCreated
      fetchResults();
    } catch (err) {
      setBatchResult({ error: err.message });
      setBatchStatus('done');
    }
  };

  const totalRecs = results?.summary?.totalRecommendations || 0;
  const issuesAlreadyCreated = results?.summary?.issuesCreated || 0;
  const canBatchCreate = results && totalRecs > 0 && issuesAlreadyCreated < totalRecs;

  return (
    <div className="panel scan-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="panel-header-left">
          <span className="panel-icon">🔍</span>
          <div>
            <h2>Proaktiv skanning</h2>
            <p className="panel-subtitle">
              Skann alle repos med dyp analyse — opprett issues automatisk
            </p>
          </div>
        </div>
        <span className={`panel-toggle ${isExpanded ? 'expanded' : ''}`}>▸</span>
      </div>

      {isExpanded && (
        <div className="panel-content">
          {/* Options */}
          <div className="scan-options">
            <label className="scan-option">
              <input
                type="checkbox"
                checked={createIssues}
                onChange={e => setCreateIssues(e.target.checked)}
              />
              <span>Opprett issues automatisk under skanning</span>
            </label>
            <label className="scan-option">
              <input
                type="checkbox"
                checked={assignCopilot}
                onChange={e => setAssignCopilot(e.target.checked)}
              />
              <span>Tildel til Copilot-agent</span>
            </label>
            <div className="scan-option-row">
              <label>
                Min. prioritet:
                <select value={minPriority} onChange={e => setMinPriority(e.target.value)}>
                  <option value="low">Lav</option>
                  <option value="medium">Medium</option>
                  <option value="high">Høy</option>
                </select>
              </label>
              <label>
                Maks repos:
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxRepos}
                  onChange={e => setMaxRepos(Number(e.target.value))}
                  style={{ width: '60px' }}
                />
              </label>
            </div>
          </div>

          {/* Start button */}
          <button
            className="btn-primary scan-start-btn"
            onClick={startScan}
            disabled={scanStatus === 'running'}
          >
            {scanStatus === 'running' ? '⏳ Skanner...' : '🚀 Start proaktiv skanning'}
          </button>

          {/* Progress */}
          {scanStatus === 'running' && (
            <div className="scan-progress">
              <div className="scan-progress-bar">
                <div
                  className="scan-progress-fill"
                  style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                />
              </div>
              <p className="scan-progress-text">
                {progress.current} / {progress.total} repos analysert
                {progress.currentRepo && <span> — {progress.currentRepo}</span>}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="scan-error">
              ⚠️ {error}
            </div>
          )}

          {/* Results */}
          {results && scanStatus !== 'running' && (
            <div className="scan-results">
              <div className="scan-summary">
                <div className="scan-summary-item">
                  <span className="scan-summary-value">{results.summary.reposScanned}</span>
                  <span className="scan-summary-label">Repos skannet</span>
                </div>
                <div className="scan-summary-item">
                  <span className="scan-summary-value">{results.summary.totalRecommendations}</span>
                  <span className="scan-summary-label">Anbefalinger</span>
                </div>
                <div className="scan-summary-item">
                  <span className="scan-summary-value">{results.summary.issuesCreated}</span>
                  <span className="scan-summary-label">Issues opprettet</span>
                </div>
              </div>

              {/* Batch create issues button */}
              {canBatchCreate && (
                <div className="scan-batch">
                  <button
                    className="btn-primary"
                    onClick={handleBatchCreateIssues}
                    disabled={batchStatus === 'loading'}
                  >
                    {batchStatus === 'loading'
                      ? '⏳ Oppretter issues...'
                      : `📝 Opprett alle ${totalRecs - issuesAlreadyCreated} issues`}
                  </button>
                  <label className="scan-option" style={{ marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      checked={assignCopilot}
                      onChange={e => setAssignCopilot(e.target.checked)}
                    />
                    <span>Tildel til Copilot</span>
                  </label>
                </div>
              )}

              {batchResult && batchStatus === 'done' && (
                <div className={batchResult.error ? 'scan-error' : 'scan-batch-result'}>
                  {batchResult.error ? (
                    <p>⚠️ {batchResult.error}</p>
                  ) : (
                    <p>
                      ✅ {batchResult.summary.created} issues opprettet
                      {batchResult.summary.skipped > 0 && `, ${batchResult.summary.skipped} hoppet over (duplikater)`}
                      {batchResult.summary.errors > 0 && `, ${batchResult.summary.errors} feilet`}
                    </p>
                  )}
                </div>
              )}

              {/* Per-repo results */}
              <div className="scan-repo-list">
                {results.results.map((r) => (
                  <div key={r.repo.fullName} className="scan-repo-item">
                    <div className="scan-repo-header">
                      <a href={r.repo.url} target="_blank" rel="noopener noreferrer">
                        {r.repo.fullName}
                      </a>
                      {r.repo.projectType && (
                        <span className="scan-project-type">{r.repo.projectType}</span>
                      )}
                      <span className="scan-rec-count">
                        {r.recommendations.length} anbefaling{r.recommendations.length !== 1 ? 'er' : ''}
                      </span>
                    </div>
                    {r.recommendations.length > 0 && (
                      <ul className="scan-rec-list">
                        {r.recommendations.map((rec, i) => (
                          <li key={i} className={`scan-rec priority-${rec.priority}`}>
                            <span className="scan-rec-title">{rec.title}</span>
                            <span className="rec-priority">{rec.priority}</span>
                            {r.issuesCreated.find(ic => ic.title === rec.title && ic.status === 'created') && (
                              <a
                                href={r.issuesCreated.find(ic => ic.title === rec.title).issueUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="scan-issue-link"
                              >
                                📎 Issue
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScanControl;
