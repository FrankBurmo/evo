import React from 'react';
import ScanRepoItem from './ScanRepoItem';
import type { Recommendation, ScanResults as ScanResultsData, IssueCreatedEntry } from '../types';

interface BatchResult {
  error?: string;
  summary?: {
    created: number;
    skipped: number;
    errors: number;
  };
}

interface ScanResultsProps {
  results: ScanResultsData;
  selectedRecs: Record<string, Set<number>>;
  totalSelected: number;
  individualStatus: Record<string, 'loading' | 'created' | 'error'>;
  assignCopilot: boolean;
  setAssignCopilot: (v: boolean) => void;
  batchStatus: 'idle' | 'loading' | 'done';
  batchResult: BatchResult | null;
  onBatchCreate: () => void;
  onToggleRec: (repoFullName: string, index: number) => void;
  onSelectAll: (
    repoFullName: string,
    recommendations: Recommendation[],
    issuesCreated: IssueCreatedEntry[] | undefined,
  ) => void;
  onDeselectAll: (repoFullName: string) => void;
  onSelectAllGlobal: () => void;
  onDeselectAllGlobal: () => void;
  onCreateSingle: (repoFullName: string, index: number) => void;
}

/**
 * ScanResults — viser oppsummering, batch-verktøylinje og per-repo-resultater.
 */
function ScanResults({
  results,
  selectedRecs,
  totalSelected,
  individualStatus,
  assignCopilot,
  setAssignCopilot,
  batchStatus,
  batchResult,
  onBatchCreate,
  onToggleRec,
  onSelectAll,
  onDeselectAll,
  onSelectAllGlobal,
  onDeselectAllGlobal,
  onCreateSingle,
}: ScanResultsProps): React.JSX.Element {
  const totalRecs = results?.summary?.totalRecommendations || 0;
  const issuesAlreadyCreated = results?.summary?.issuesCreated || 0;
  const pendingRecs = totalRecs - issuesAlreadyCreated;
  const isBatchLoading = batchStatus === 'loading';
  const canBatchCreate = results && totalSelected > 0 && !isBatchLoading;

  return (
    <div className="scan-results">
      {/* Oppsummering */}
      <div className="scan-summary">
        <div className="scan-summary-item">
          <span className="scan-summary-value">{results.summary.reposScanned}</span>
          <span className="scan-summary-label">Repos skannet</span>
        </div>
        <div className="scan-summary-item">
          <span className="scan-summary-value">
            {results.summary.totalRecommendations}
          </span>
          <span className="scan-summary-label">Anbefalinger</span>
        </div>
        <div className="scan-summary-item">
          <span className="scan-summary-value">{results.summary.issuesCreated}</span>
          <span className="scan-summary-label">Issues opprettet</span>
        </div>
        <div className="scan-summary-item">
          <span className="scan-summary-value">{totalSelected}</span>
          <span className="scan-summary-label">Valgt</span>
        </div>
      </div>

      {/* Velg-verktøylinje */}
      {pendingRecs > 0 && (
        <div className="scan-selection-toolbar">
          <div className="scan-selection-info">
            <span className="scan-selection-count">
              {totalSelected} av {pendingRecs} anbefaling
              {pendingRecs !== 1 ? 'er' : ''} valgt
            </span>
          </div>
          <div className="scan-selection-actions">
            <button className="btn-outline btn-sm" onClick={onSelectAllGlobal}>
              Velg alle
            </button>
            <button className="btn-outline btn-sm" onClick={onDeselectAllGlobal}>
              Fjern alle
            </button>
          </div>
        </div>
      )}

      {/* Batch-opprett */}
      {results && totalSelected > 0 && (
        <div className="scan-batch">
          <button
            className="btn-primary"
            onClick={onBatchCreate}
            disabled={batchStatus === 'loading'}
          >
            {batchStatus === 'loading'
              ? '⏳ Oppretter issues...'
              : `📝 Opprett ${totalSelected} valgte issue${totalSelected !== 1 ? 's' : ''}`}
          </button>
          <label className="scan-option" style={{ marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={assignCopilot}
              onChange={(e) => setAssignCopilot(e.target.checked)}
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
              ✅ {batchResult.summary?.created} issues opprettet
              {(batchResult.summary?.skipped ?? 0) > 0 &&
                `, ${batchResult.summary?.skipped} hoppet over (duplikater)`}
              {(batchResult.summary?.errors ?? 0) > 0 &&
                `, ${batchResult.summary?.errors} feilet`}
            </p>
          )}
        </div>
      )}

      {/* Per-repo-resultater */}
      <div className="scan-repo-list">
        {results.results.map((r) => (
          <ScanRepoItem
            key={r.repo.fullName}
            result={r}
            selectedRecs={selectedRecs}
            individualStatus={individualStatus}
            onToggleRec={onToggleRec}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            onCreateSingle={onCreateSingle}
          />
        ))}
      </div>
    </div>
  );
}

export default ScanResults;
