import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  onLogout: () => void;
  showActions?: boolean;
}

/**
 * Header — delt header-komponent for alle Dashboard-tilstander.
 * Inkluderer dark/light-modus-veksler og responsiv mobilmeny (hamburger).
 */
function Header({ onLogout, showActions = false }: HeaderProps): React.JSX.Element {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header" role="banner">
      <div className="header-brand">
        <div className="header-logo" aria-hidden="true">E</div>
        <div className="header-title">
          <h1>Evo</h1>
          <p>Produktene dine vokser kontinuerlig – automatisk.</p>
        </div>
      </div>

      {/* Desktop + mobil (åpen) actions */}
      <div
        className={`header-actions${menuOpen ? ' header-actions--open' : ''}`}
        role="toolbar"
        aria-label="Headerhandlinger"
      >
        <button
          className="btn-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
          title={theme === 'dark' ? 'Lyst tema' : 'Mørkt tema'}
        >
          {theme === 'dark' ? 'Lys' : 'Mørk'}
        </button>
        {showActions && (
          <>
            <span className="status-dot" aria-label="Tilkoblet">live</span>
            <button className="btn-logout" onClick={onLogout}>
              Logg ut
            </button>
          </>
        )}
      </div>

      {/* Hamburger-knapp — kun synlig på mobil */}
      <button
        className="header-menu-toggle"
        aria-label={menuOpen ? 'Lukk meny' : 'Åpne meny'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <span className={`hamburger${menuOpen ? ' hamburger--open' : ''}`} aria-hidden="true">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </span>
      </button>
    </header>
  );
}

export default Header;

