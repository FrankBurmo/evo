import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

/**
 * ConfigurablePanel — generisk panel-komponent som erstatter
 * GuardrailsPanel, ProductDevelopmentPanel og EngineeringVelocityPanel.
 *
 * Props:
 *   title        — Paneltittel med emoji, f.eks. "🛡️ Guardrails"
 *   description  — Beskrivelse vist under overskriften
 *   items        — Array av { id, name, description, icon, category, canTrigger, defaultEnabled }
 *   storageKey   — localStorage-nøkkel for å lagre toggletilstand
 *   apiPrefix    — API-endepunktprefix, f.eks. "/api/guardrails"
 *   colorScheme  — { accent, accentBg, accentBorder, btnGradient, btnShadow, categoryPrefix }
 *   repos        — Array av repoData-objekter
 *   token        — GitHub PAT
 *   triggerTitle — Overskrift for trigger-seksjonen
 *   triggerDesc  — Beskrivelse for trigger-seksjonen
 *   triggerBtnLabel — Label for trigger-knappen, f.eks. "🚀 Kjør analyse"
 *   hasActionSelect — Om panelet har et valg mellom flere handlinger (true for multi-action paneler)
 */
function ConfigurablePanel({
  title,
  description,
  items: defaultItems,
  storageKey,
  apiPrefix,
  colorScheme,
  repos,
  token,
  triggerTitle,
  triggerDesc,
  triggerBtnLabel = '🚀 Kjør analyse',
  hasActionSelect = false,
}) {
  const [savedConfig, setSavedConfig] = useLocalStorage(storageKey, null);

  const [items, setItems] = useState(() => {
    if (savedConfig) {
      return defaultItems.map(item => ({
        ...item,
        enabled: savedConfig[item.id] !== undefined ? savedConfig[item.id] : item.defaultEnabled,
      }));
    }
    return defaultItems.map(item => ({ ...item, enabled: item.defaultEnabled }));
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
      setSavedConfig(config);
      return updated;
    });
  };

  const triggerAction = async (actionId, repoFullName) => {
    if (!repoFullName || (!actionId && hasActionSelect)) return;
    const [owner, repoName] = repoFullName.split('/');

    // For single-action panels (like Guardrails), the actionId is the triggerable item's id
    const effectiveActionId = actionId || items.find(i => i.canTrigger)?.id;
    const key = hasActionSelect ? `${effectiveActionId}:${repoFullName}` : repoFullName;

    setTriggerState(prev => ({ ...prev, [key]: 'loading' }));

    try {
      const endpoint = hasActionSelect
        ? `${apiPrefix}/${effectiveActionId}`
        : `${apiPrefix}/${effectiveActionId}`;

      const response = await fetch(endpoint, {
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
    } catch (/** @type {any} */ err) {
      setTriggerState(prev => ({ ...prev, [key]: 'error' }));
      setTriggerResults(prev => ({ ...prev, [key]: { error: err.message } }));
    }
  };

  const enabledCount = items.filter(i => i.enabled).length;
  const enabledTriggerable = items.filter(i => i.enabled && i.canTrigger);
  const showTrigger = hasActionSelect
    ? enabledTriggerable.length > 0
    : enabledTriggerable.length > 0;

  const currentKey = hasActionSelect
    ? `${selectedAction}:${selectedRepo}`
    : selectedRepo;

  const prefix = colorScheme.cssPrefix;
  const panelId = `panel-${storageKey}`;

  return (
    <div className={`panel panel--${prefix}`}>
      <button
        className="panel__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <span className="panel__header-left">
          <span className="panel__title">{title}</span>
          <span className="panel__badge">{enabledCount}/{items.length} aktive</span>
        </span>
        <span className="panel__toggle-icon" aria-hidden="true">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="panel__content" id={panelId} role="region">
          <p className="panel__description">{description}</p>

          <div className="panel__list">
            {items.map(item => (
              <div
                key={item.id}
                className={`panel__item ${item.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="panel__item-info">
                  <div className="panel__item-name">
                    <span className="panel__item-icon">{item.icon}</span>
                    <span>{item.name}</span>
                    <span className={`panel__item-category cat-${item.category}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="panel__item-desc">{item.description}</p>
                </div>
                <div className="panel__item-controls">
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

          {showTrigger && (
            <div className="panel__trigger-section">
              <h4>{triggerTitle}</h4>
              <p>{triggerDesc}</p>

              <div className="trigger-controls">
                {hasActionSelect && (
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
                )}

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
                  className="btn-trigger"
                  disabled={
                    !selectedRepo ||
                    (hasActionSelect && !selectedAction) ||
                    triggerState[currentKey] === 'loading'
                  }
                  onClick={() => triggerAction(selectedAction, selectedRepo)}
                >
                  {triggerState[currentKey] === 'loading'
                    ? '⏳ Oppretter...'
                    : triggerBtnLabel}
                </button>
              </div>

              {/* Status messages */}
              {selectedRepo && (hasActionSelect ? selectedAction : true) && (() => {
                const state = triggerState[currentKey];
                const result = triggerResults[currentKey];

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

export default ConfigurablePanel;
