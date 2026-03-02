import React from 'react';
import type { ScanStatus } from '../types';

interface ScanOptionsProps {
  createIssues: boolean;
  setCreateIssues: (v: boolean) => void;
  assignCopilot: boolean;
  setAssignCopilot: (v: boolean) => void;
  minPriority: string;
  setMinPriority: (v: string) => void;
  maxRepos: number;
  setMaxRepos: (v: number) => void;
  scanStatus: ScanStatus;
  onStart: () => void;
}

/**
 * ScanOptions — innstillinger-panel for proaktiv skanning.
 */
function ScanOptions({
  createIssues,
  setCreateIssues,
  assignCopilot,
  setAssignCopilot,
  minPriority,
  setMinPriority,
  maxRepos,
  setMaxRepos,
  scanStatus,
  onStart,
}: ScanOptionsProps): React.JSX.Element {
  return (
    <>
      <div className="scan-options">
        <label className="scan-option">
          <input
            type="checkbox"
            checked={createIssues}
            onChange={(e) => setCreateIssues(e.target.checked)}
          />
          <span>Opprett issues automatisk under skanning</span>
        </label>
        <label className="scan-option">
          <input
            type="checkbox"
            checked={assignCopilot}
            onChange={(e) => setAssignCopilot(e.target.checked)}
          />
          <span>Tildel til Copilot-agent</span>
        </label>
        <div className="scan-option-row">
          <label>
            Min. prioritet:
            <select value={minPriority} onChange={(e) => setMinPriority(e.target.value)}>
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
              onChange={(e) => setMaxRepos(Number(e.target.value))}
              style={{ width: '60px' }}
            />
          </label>
        </div>
      </div>

      <button
        className="btn-primary scan-start-btn"
        onClick={onStart}
        disabled={scanStatus === 'running'}
      >
        {scanStatus === 'running' ? '⏳ Skanner...' : '🚀 Start proaktiv skanning'}
      </button>
    </>
  );
}

export default ScanOptions;
