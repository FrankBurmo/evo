import React from 'react';
import type { Recommendation, ScanRepoResult, IssueCreatedEntry } from '../types';

interface ScanRepoItemProps {
  result: ScanRepoResult;
  selectedRecs: Record<string, Set<number>>;
  individualStatus: Record<string, 'loading' | 'created' | 'error'>;
  onToggleRec: (repoFullName: string, index: number) => void;
  onSelectAll: (
    repoFullName: string,
    recommendations: Recommendation[],
    issuesCreated: IssueCreatedEntry[] | undefined,
  ) => void;
  onDeselectAll: (repoFullName: string) => void;
  onCreateSingle: (repoFullName: string, index: number) => void;
}

/**
 * ScanRepoItem — ett repo-resultat med anbefalinger og checkboxer.
 */
function ScanRepoItem({
  result,
  selectedRecs,
  individualStatus,
  onToggleRec,
  onSelectAll,
  onDeselectAll,
  onCreateSingle,
}: ScanRepoItemProps): React.JSX.Element {
  const repoSel = selectedRecs[result.repo.fullName] ?? new Set<number>();

  const creatableRecs = result.recommendations.filter(
    (rec) =>
      !result.issuesCreated?.find(
        (ic) => ic.title === rec.title && ic.status === 'created',
      ),
  );

  const allSelected =
    creatableRecs.length > 0 &&
    creatableRecs.every((_, i) => {
      const origIdx = result.recommendations.indexOf(creatableRecs[i]);
      return repoSel.has(origIdx);
    });

  return (
    <div className="scan-repo-item">
      <div className="scan-repo-header">
        <a href={result.repo.url as string} target="_blank" rel="noopener noreferrer">
          {result.repo.fullName}
        </a>
        {result.repo.projectType && (
          <span className="scan-project-type">{result.repo.projectType}</span>
        )}
        <span className="scan-rec-count">
          {result.recommendations.length} anbefaling
          {result.recommendations.length !== 1 ? 'er' : ''}
        </span>
        {creatableRecs.length > 0 && (
          <button
            className="btn-outline btn-xs scan-repo-select-toggle"
            onClick={() =>
              allSelected
                ? onDeselectAll(result.repo.fullName)
                : onSelectAll(
                    result.repo.fullName,
                    result.recommendations,
                    result.issuesCreated,
                  )
            }
          >
            {allSelected ? 'Fjern valg' : 'Velg alle'}
          </button>
        )}
      </div>
      {result.recommendations.length > 0 && (
        <ul className="scan-rec-list">
          {result.recommendations.map((rec, i) => {
            const alreadyCreated = result.issuesCreated?.find(
              (ic) => ic.title === rec.title && ic.status === 'created',
            );
            const isSelected = repoSel.has(i);
            const indKey = `${result.repo.fullName}::${i}`;
            const indStatus = individualStatus[indKey];

            return (
              <li
                key={i}
                className={`scan-rec priority-${rec.priority} ${isSelected ? 'scan-rec-selected' : ''} ${alreadyCreated ? 'scan-rec-created' : ''}`}
              >
                {!alreadyCreated && (
                  <input
                    type="checkbox"
                    className="scan-rec-checkbox"
                    checked={isSelected}
                    onChange={() => onToggleRec(result.repo.fullName, i)}
                  />
                )}
                <span className="scan-rec-title">{rec.title}</span>
                <span className="rec-priority">{rec.priority}</span>
                {rec.type && <span className="scan-rec-type">{rec.type}</span>}
                {alreadyCreated ? (
                  <a
                    href={
                      alreadyCreated.issueUrl ??
                      result.issuesCreated?.find((ic) => ic.title === rec.title)?.issueUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scan-issue-link"
                  >
                    ✅ Issue
                  </a>
                ) : (
                  <div className="scan-rec-actions">
                    {indStatus === 'loading' ? (
                      <span className="scan-rec-status loading">⏳</span>
                    ) : indStatus === 'created' ? (
                      <span className="scan-rec-status created">✅</span>
                    ) : indStatus === 'error' ? (
                      <span className="scan-rec-status error">❌</span>
                    ) : (
                      <button
                        className="btn-outline btn-xs scan-create-single"
                        onClick={() => onCreateSingle(result.repo.fullName, i)}
                        title="Opprett issue for denne anbefalingen"
                      >
                        📝
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ScanRepoItem;
