import React from 'react';
import type { ScanProgressState } from '../types';

interface ScanProgressProps {
  progress: ScanProgressState;
}

/**
 * ScanProgress — fremdriftsindikator under pågående skanning.
 */
function ScanProgress({ progress }: ScanProgressProps): React.JSX.Element {
  const percentage =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="scan-progress">
      <div
        className="scan-progress-bar"
        role="progressbar"
        aria-valuenow={progress.current}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-label={`Skanning: ${percentage}% fullført`}
      >
        <div className="scan-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <p className="scan-progress-text">
        {progress.current} / {progress.total} repos analysert
        {progress.currentRepo && <span> — {progress.currentRepo}</span>}
      </p>
    </div>
  );
}

export default ScanProgress;
