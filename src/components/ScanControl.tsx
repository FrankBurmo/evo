import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ScanOptions from './ScanOptions';
import ScanProgress from './ScanProgress';
import ScanResults from './ScanResults';
import type {
  ScanStatus,
  ScanResults as ScanResultsData,
  ScanProgressState,
  Recommendation,
  IssueCreatedEntry,
} from '../types';

interface ScanControlProps {
  token: string;
}

interface BatchResult {
  error?: string;
  summary?: {
    created: number;
    skipped: number;
    errors: number;
  };
}

/**
 * ScanControl — orkestreringskomponent for proaktiv skanning.
 *
 * Delegerer UI til:
 *   ScanOptions   — innstillinger og start-knapp
 *   ScanProgress  — fremdriftsindikator
 *   ScanResults   — oppsummering, utvalg og per-repo-resultater
 *     └ ScanRepoItem — enkelt repo med anbefalinger
 */
function ScanControl({ token }: ScanControlProps): React.JSX.Element {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState<ScanProgressState>({
    current: 0,
    total: 0,
    currentRepo: null,
  });
  const [results, setResults] = useState<ScanResultsData | null>(null);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Options
  const [createIssues, setCreateIssues] = useState(false);
  const [assignCopilot, setAssignCopilot] = useState(false);
  const [minPriority, setMinPriority] = useState('medium');
  const [maxRepos, setMaxRepos] = useState(50);

  // Batch issue creation
  const [batchStatus, setBatchStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  // Selection state: { "owner/repo": Set<recIndex> }
  const [selectedRecs, setSelectedRecs] = useState<Record<string, Set<number>>>({});
  // Track individual issue creation: { "owner/repo::recIndex": 'loading' | 'created' | 'error' }
  const [individualStatus, setIndividualStatus] = useState<
    Record<string, 'loading' | 'created' | 'error'>
  >({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch-helpers ──────────────────────────────────────────────────────────
  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/scan/results', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ScanResultsData;
      setResults(data);

      if (data?.results) {
        const sel: Record<string, Set<number>> = {};
        data.results.forEach((r) => {
          const indices = new Set<number>();
          r.recommendations.forEach((rec, i) => {
            const alreadyCreated = r.issuesCreated?.find(
              (ic) => ic.title === rec.title && ic.status === 'created',
            );
            if (!alreadyCreated) indices.add(i);
          });
          if (indices.size > 0) sel[r.repo.fullName] = indices;
        });
        setSelectedRecs(sel);
      }
    } catch (err: unknown) {
      setError('Kunne ikke hente resultater: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [token]);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scanStatus === 'running') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/scan/status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = (await res.json()) as {
            status: ScanStatus;
            progress: ScanProgressState;
            error?: string;
          };
          setProgress(data.progress);

          if (data.status === 'completed' || data.status === 'error') {
            setScanStatus(data.status);
            if (data.error) setError(data.error);
            if (pollRef.current) clearInterval(pollRef.current);
            void fetchResults();
          }
        } catch {
          // ignore temporary fetch errors
        }
      }, 1500);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scanStatus, token, fetchResults]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    setError('');
    setResults(null);
    setBatchStatus('idle');
    setBatchResult(null);
    setSelectedRecs({});
    setIndividualStatus({});
    setScanStatus('running');
    setProgress({ current: 0, total: 0, currentRepo: null });

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ createIssues, assignCopilot, minPriority, maxRepos }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setScanStatus('error');
        setError(data.error || 'Feil ved start av skanning');
      }
    } catch (err: unknown) {
      setScanStatus('error');
      setError('Nettverksfeil: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [token, createIssues, assignCopilot, minPriority, maxRepos]);

  const handleBatchCreateIssues = useCallback(async () => {
    setBatchStatus('loading');
    setBatchResult(null);
    try {
      const selected: { repoFullName: string; recIndex: number; title: string }[] = [];
      if (results?.results) {
        results.results.forEach((r) => {
          const repoSel = selectedRecs[r.repo.fullName];
          if (!repoSel || repoSel.size === 0) return;
          repoSel.forEach((i) => {
            const rec = r.recommendations[i];
            if (rec) {
              selected.push({ repoFullName: r.repo.fullName, recIndex: i, title: rec.title });
            }
          });
        });
      }

      if (selected.length === 0) {
        setBatchResult({ error: 'Ingen anbefalinger er valgt.' });
        setBatchStatus('done');
        return;
      }

      const res = await fetch('/api/scan/create-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignCopilot, selected }),
      });
      const data = (await res.json()) as BatchResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Feil');
      setBatchResult(data);
      setBatchStatus('done');
      void fetchResults();
    } catch (err: unknown) {
      setBatchResult({ error: err instanceof Error ? err.message : String(err) });
      setBatchStatus('done');
    }
  }, [token, assignCopilot, results, selectedRecs, fetchResults]);

  const handleCreateSingleIssue = useCallback(
    async (repoFullName: string, recIndex: number) => {
      const key = `${repoFullName}::${recIndex}`;
      setIndividualStatus((prev) => ({ ...prev, [key]: 'loading' }));
      try {
        const res = await fetch('/api/scan/create-issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignCopilot,
            selected: [{ repoFullName, recIndex }],
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Feil');
        setIndividualStatus((prev) => ({ ...prev, [key]: 'created' }));
        void fetchResults();
      } catch {
        setIndividualStatus((prev) => ({ ...prev, [key]: 'error' }));
      }
    },
    [token, assignCopilot, fetchResults],
  );

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleRec = useCallback((repoFullName: string, recIndex: number) => {
    setSelectedRecs((prev) => {
      const copy = { ...prev };
      const s = new Set(copy[repoFullName] ?? []);
      if (s.has(recIndex)) s.delete(recIndex);
      else s.add(recIndex);
      if (s.size === 0) delete copy[repoFullName];
      else copy[repoFullName] = s;
      return copy;
    });
  }, []);

  const selectAllForRepo = useCallback(
    (
      repoFullName: string,
      recommendations: Recommendation[],
      issuesCreated: IssueCreatedEntry[] | undefined,
    ) => {
      setSelectedRecs((prev) => {
        const copy = { ...prev };
        const s = new Set<number>();
        recommendations.forEach((rec, i) => {
          const alreadyCreated = issuesCreated?.find(
            (ic) => ic.title === rec.title && ic.status === 'created',
          );
          if (!alreadyCreated) s.add(i);
        });
        if (s.size > 0) copy[repoFullName] = s;
        else delete copy[repoFullName];
        return copy;
      });
    },
    [],
  );

  const deselectAllForRepo = useCallback((repoFullName: string) => {
    setSelectedRecs((prev) => {
      const copy = { ...prev };
      delete copy[repoFullName];
      return copy;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!results?.results) return;
    const sel: Record<string, Set<number>> = {};
    results.results.forEach((r) => {
      const indices = new Set<number>();
      r.recommendations.forEach((rec, i) => {
        const alreadyCreated = r.issuesCreated?.find(
          (ic) => ic.title === rec.title && ic.status === 'created',
        );
        if (!alreadyCreated) indices.add(i);
      });
      if (indices.size > 0) sel[r.repo.fullName] = indices;
    });
    setSelectedRecs(sel);
  }, [results]);

  const deselectAll = useCallback(() => {
    setSelectedRecs({});
  }, []);

  const totalSelected = useMemo(() => {
    let count = 0;
    Object.values(selectedRecs).forEach((s) => {
      count += s.size;
    });
    return count;
  }, [selectedRecs]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="panel scan-panel">
      <h2 className="sr-only" id="scan-panel-heading">
        Proaktiv skanning
      </h2>
      <button
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="scan-panel-content"
      >
        <div className="panel-header-left">
          <span className="panel-icon" aria-hidden="true">
            🔍
          </span>
          <div>
            <span className="panel-header-title">Proaktiv skanning</span>
            <p className="panel-subtitle">
              Skann alle repos med dyp analyse — opprett issues automatisk
            </p>
          </div>
        </div>
        <span
          className={`panel-toggle ${isExpanded ? 'expanded' : ''}`}
          aria-hidden="true"
        >
          ▸
        </span>
      </button>

      {isExpanded && (
        <div
          className="panel-content"
          id="scan-panel-content"
          role="region"
          aria-labelledby="scan-panel-heading"
        >
          <ScanOptions
            createIssues={createIssues}
            setCreateIssues={setCreateIssues}
            assignCopilot={assignCopilot}
            setAssignCopilot={setAssignCopilot}
            minPriority={minPriority}
            setMinPriority={setMinPriority}
            maxRepos={maxRepos}
            setMaxRepos={setMaxRepos}
            scanStatus={scanStatus}
            onStart={startScan}
          />

          {scanStatus === 'running' && <ScanProgress progress={progress} />}

          {error && (
            <div className="scan-error" role="alert" aria-live="assertive">
              ⚠️ {error}
            </div>
          )}

          {results && scanStatus !== 'running' && (
            <ScanResults
              results={results}
              selectedRecs={selectedRecs}
              totalSelected={totalSelected}
              individualStatus={individualStatus}
              assignCopilot={assignCopilot}
              setAssignCopilot={setAssignCopilot}
              batchStatus={batchStatus}
              batchResult={batchResult}
              onBatchCreate={handleBatchCreateIssues}
              onToggleRec={toggleRec}
              onSelectAll={selectAllForRepo}
              onDeselectAll={deselectAllForRepo}
              onSelectAllGlobal={selectAll}
              onDeselectAllGlobal={deselectAll}
              onCreateSingle={handleCreateSingleIssue}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ScanControl;
