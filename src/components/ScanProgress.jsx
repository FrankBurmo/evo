import React from 'react';

/**
 * ScanProgress — fremdriftsindikator under pågående skanning.
 */
function ScanProgress({ progress }) {
  return (
    <div className="scan-progress">
      <div className="scan-progress-bar">
        <div
          className="scan-progress-fill"
          style={{
            width: progress.total > 0
              ? `${(progress.current / progress.total) * 100}%`
              : '0%',
          }}
        />
      </div>
      <p className="scan-progress-text">
        {progress.current} / {progress.total} repos analysert
        {progress.currentRepo && <span> — {progress.currentRepo}</span>}
      </p>
    </div>
  );
}

export default ScanProgress;
