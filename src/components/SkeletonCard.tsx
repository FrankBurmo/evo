import React from 'react';

/**
 * SkeletonCard — plassholder-komponent som vises mens data lastes.
 * Erstatter «Laster repositories...»-teksten med visuell skjelettanimasjon.
 */
function SkeletonCard(): React.JSX.Element {
  return (
    <div className="repo-card skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-desc" />
      <div className="skeleton-meta">
        <div className="skeleton-pill" />
        <div className="skeleton-pill" />
        <div className="skeleton-pill" />
      </div>
      <div className="skeleton-recs">
        <div className="skeleton-line skeleton-rec" />
        <div className="skeleton-line skeleton-rec" />
      </div>
    </div>
  );
}

export default SkeletonCard;
