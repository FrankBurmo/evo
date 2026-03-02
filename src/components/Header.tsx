import React from 'react';

interface HeaderProps {
  onLogout: () => void;
  showActions?: boolean;
}

/**
 * Header — delt header-komponent for alle Dashboard-tilstander.
 * Trekkt ut fra Dashboard for å eliminere duplisering (vises i 3 tilstander).
 */
function Header({ onLogout, showActions = false }: HeaderProps): React.JSX.Element {
  return (
    <header className="header" role="banner">
      <div className="header-brand">
        <div className="header-logo" aria-hidden="true">⚡</div>
        <div className="header-title">
          <h1>Evo</h1>
          <p>Produktene dine vokser kontinuerlig – automatisk.</p>
        </div>
      </div>
      {showActions && (
        <div className="header-actions">
          <span className="status-dot" aria-label="Tilkoblet">live</span>
          <button className="btn-logout" onClick={onLogout}>
            Logg ut
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
