import React, { useState } from 'react';

const PRODUCT_DEV_ITEMS = [
  {
    id: 'ux-audit',
    name: 'Brukeropplevelse (UX-audit)',
    description:
      'Ber en AI-agent gjennomgå repoet fra et brukerperspektiv — tilgjengelighet, feilhåndtering, navigasjon, onboarding og UI-konsistens',
    icon: '🎨',
    category: 'ux',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'market-opportunity',
    name: 'Markedsmuligheter & Vekst',
    description:
      'Analyser repoet for å identifisere markedsgap, vekstpotensial, mulige nye brukergrupper og strategisk posisjonering mot konkurrenter',
    icon: '📈',
    category: 'market',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'feature-discovery',
    name: 'Feature Discovery & Prioritering',
    description:
      'Gjennomgå eksisterende funksjonalitet og foreslå nye features, forbedringer og optimaliseringer — prioritert etter brukerverdi og innsats',
    icon: '💡',
    category: 'features',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'developer-experience',
    name: 'Utvikleropplevelse (DX)',
    description:
      'Vurder hvor enkelt det er for nye utviklere å bidra — API-design, dokumentasjon, onboarding, tooling og SDK-kvalitet',
    icon: '🛠️',
    category: 'dx',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'product-market-fit',
    name: 'Produkt-Markedstilpasning',
    description:
      'Evaluer om produktet effektivt løser reelle brukerproblemer og foreslå justeringer for bedre produkt-markedstilpasning',
    icon: '🎯',
    category: 'pmf',
    canTrigger: true,
    defaultEnabled: false,
  },
];

function ProductDevelopmentPanel({ repos, token }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('productdev_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return PRODUCT_DEV_ITEMS.map(item => ({
        ...item,
        enabled: parsed[item.id] !== undefined ? parsed[item.id] : item.defaultEnabled,
      }));
    }
    return PRODUCT_DEV_ITEMS.map(item => ({ ...item, enabled: item.defaultEnabled }));
  });

  const [triggerState, setTriggerState] = useState({});
  const [triggerResults, setTriggerResults] = useState({});
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleItem = (id) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      );
      const config = {};
      updated.forEach(item => { config[item.id] = item.enabled; });
      localStorage.setItem('productdev_config', JSON.stringify(config));
      return updated;
    });
  };

  const triggerAction = async (actionId, repoFullName) => {
    if (!repoFullName || !actionId) return;
    const [owner, repoName] = repoFullName.split('/');
    const key = `${actionId}:${repoFullName}`;

    setTriggerState(prev => ({ ...prev, [key]: 'loading' }));

    try {
      const response = await fetch(`/api/product-dev/${actionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ owner, repo: repoName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Noe gikk galt');
      }

      setTriggerState(prev => ({ ...prev, [key]: 'success' }));
      setTriggerResults(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      setTriggerState(prev => ({ ...prev, [key]: 'error' }));
      setTriggerResults(prev => ({ ...prev, [key]: { error: err.message } }));
    }
  };

  const enabledCount = items.filter(i => i.enabled).length;
  const enabledTriggerable = items.filter(i => i.enabled && i.canTrigger);

  return (
    <div className="productdev-panel">
      <div className="productdev-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="productdev-header-left">
          <h3>🚀 Produktutvikling</h3>
          <span className="productdev-badge">{enabledCount}/{items.length} aktive</span>
        </div>
        <button className="productdev-toggle-btn">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="productdev-content">
          <p className="productdev-description">
            Produktutviklingsverktøy som hjelper deg å forstå brukerbehov, identifisere
            markedsmuligheter og gjøre produktene dine mer verdifulle. Trigger en AI-agent
            som oppretter et GitHub-issue med detaljert analyse og konkrete forbedringsforslag.
          </p>

          <div className="productdev-list">
            {items.map(item => (
              <div
                key={item.id}
                className={`productdev-item ${item.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="productdev-info">
                  <div className="productdev-name">
                    <span className="productdev-icon">{item.icon}</span>
                    <span>{item.name}</span>
                    <span className={`productdev-category pcat-${item.category}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="productdev-desc">{item.description}</p>
                </div>
                <div className="productdev-controls">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Trigger Section */}
          {enabledTriggerable.length > 0 && (
            <div className="productdev-trigger-section">
              <h4>🚀 Trigger Produktutviklingsanalyse</h4>
              <p>
                Velg en analyse og et repository. En AI-agent vil opprette et GitHub-issue
                med en grundig analyse og konkrete, handlingsbare forbedringsforslag.
              </p>

              <div className="trigger-controls">
                <select
                  value={selectedAction}
                  onChange={e => setSelectedAction(e.target.value)}
                  className="repo-select"
                >
                  <option value="">Velg analyse...</option>
                  {enabledTriggerable.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.icon} {item.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRepo}
                  onChange={e => setSelectedRepo(e.target.value)}
                  className="repo-select"
                >
                  <option value="">Velg repository...</option>
                  {repos.map(r => (
                    <option key={r.repo.fullName} value={r.repo.fullName}>
                      {r.repo.fullName}
                    </option>
                  ))}
                </select>

                <button
                  className="btn-trigger productdev-btn"
                  disabled={
                    !selectedAction ||
                    !selectedRepo ||
                    triggerState[`${selectedAction}:${selectedRepo}`] === 'loading'
                  }
                  onClick={() => triggerAction(selectedAction, selectedRepo)}
                >
                  {triggerState[`${selectedAction}:${selectedRepo}`] === 'loading'
                    ? '⏳ Oppretter...'
                    : '🚀 Kjør analyse'}
                </button>
              </div>

              {/* Status messages */}
              {selectedAction && selectedRepo && (() => {
                const key = `${selectedAction}:${selectedRepo}`;
                const state = triggerState[key];
                const result = triggerResults[key];

                if (state === 'success') {
                  return (
                    <div className="trigger-result success">
                      <span>✅ Issue opprettet!</span>
                      {result?.issueUrl && (
                        <a href={result.issueUrl} target="_blank" rel="noopener noreferrer">
                          🔗 Åpne issue på GitHub
                        </a>
                      )}
                      {result?.note && <p className="trigger-note">{result.note}</p>}
                    </div>
                  );
                }
                if (state === 'error') {
                  return (
                    <div className="trigger-result error">
                      <span>❌ {result?.error || 'Noe gikk galt'}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductDevelopmentPanel;
