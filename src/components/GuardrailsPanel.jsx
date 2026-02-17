import React, { useState } from 'react';

const DEFAULT_GUARDRAILS = [
  {
    id: 'documentation-check',
    name: 'Dokumentasjonssjekk',
    description: 'Sjekker om repoet har README, CONTRIBUTING.md og god dokumentasjon',
    icon: '📝',
    category: 'quality',
    canTrigger: false,
    defaultEnabled: true,
  },
  {
    id: 'activity-monitor',
    name: 'Aktivitetsovervåking',
    description: 'Varsler når et repo har vært inaktivt i over 30 dager',
    icon: '📊',
    category: 'monitoring',
    canTrigger: false,
    defaultEnabled: true,
  },
  {
    id: 'issue-triage',
    name: 'Issue-triagering',
    description: 'Flagger repos med mange åpne issues som trenger oppmerksomhet',
    icon: '🐛',
    category: 'maintenance',
    canTrigger: false,
    defaultEnabled: true,
  },
  {
    id: 'security-check',
    name: 'Sikkerhetssjekk',
    description: 'Kontrollerer at repoet har sikkerhetspolicyer og Dependabot aktivert',
    icon: '🔒',
    category: 'security',
    canTrigger: false,
    defaultEnabled: false,
  },
  {
    id: 'architecture-analysis',
    name: 'Arkitekturanalyse',
    description: 'Oppretter et GitHub-issue som ber en AI-agent analysere repoet dypt teknisk og foreslå forbedringer — som en erfaren software-arkitekt',
    icon: '🏗️',
    category: 'analysis',
    canTrigger: true,
    defaultEnabled: true,
  },
];

function GuardrailsPanel({ repos, token }) {
  const [guardrails, setGuardrails] = useState(() => {
    const saved = localStorage.getItem('guardrails_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge saved state with defaults (in case new guardrails were added)
      return DEFAULT_GUARDRAILS.map(g => ({
        ...g,
        enabled: parsed[g.id] !== undefined ? parsed[g.id] : g.defaultEnabled,
      }));
    }
    return DEFAULT_GUARDRAILS.map(g => ({ ...g, enabled: g.defaultEnabled }));
  });

  const [triggerState, setTriggerState] = useState({}); // { repoFullName: 'idle' | 'loading' | 'success' | 'error' }
  const [triggerResults, setTriggerResults] = useState({});
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleGuardrail = (id) => {
    setGuardrails(prev => {
      const updated = prev.map(g =>
        g.id === id ? { ...g, enabled: !g.enabled } : g
      );
      // Persist to localStorage
      const config = {};
      updated.forEach(g => { config[g.id] = g.enabled; });
      localStorage.setItem('guardrails_config', JSON.stringify(config));
      return updated;
    });
  };

  const triggerArchitectureAnalysis = async (repoFullName) => {
    if (!repoFullName) return;
    const [owner, repoName] = repoFullName.split('/');

    setTriggerState(prev => ({ ...prev, [repoFullName]: 'loading' }));

    try {
      const response = await fetch('/api/guardrails/architecture-analysis', {
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

      setTriggerState(prev => ({ ...prev, [repoFullName]: 'success' }));
      setTriggerResults(prev => ({ ...prev, [repoFullName]: data }));
    } catch (err) {
      setTriggerState(prev => ({ ...prev, [repoFullName]: 'error' }));
      setTriggerResults(prev => ({ ...prev, [repoFullName]: { error: err.message } }));
    }
  };

  const enabledCount = guardrails.filter(g => g.enabled).length;
  const archGuardrail = guardrails.find(g => g.id === 'architecture-analysis');

  return (
    <div className="guardrails-panel">
      <div className="guardrails-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="guardrails-header-left">
          <h3>🛡️ Guardrails</h3>
          <span className="guardrails-badge">{enabledCount}/{guardrails.length} aktive</span>
        </div>
        <button className="guardrails-toggle-btn">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="guardrails-content">
          <p className="guardrails-description">
            Guardrails er automatiserte sjekker og handlinger som hjelper deg med å holde
            repoene dine i god form. Slå dem av eller på etter behov.
          </p>

          <div className="guardrails-list">
            {guardrails.map(guardrail => (
              <div
                key={guardrail.id}
                className={`guardrail-item ${guardrail.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="guardrail-info">
                  <div className="guardrail-name">
                    <span className="guardrail-icon">{guardrail.icon}</span>
                    <span>{guardrail.name}</span>
                    <span className={`guardrail-category cat-${guardrail.category}`}>
                      {guardrail.category}
                    </span>
                  </div>
                  <p className="guardrail-desc">{guardrail.description}</p>
                </div>
                <div className="guardrail-controls">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={guardrail.enabled}
                      onChange={() => toggleGuardrail(guardrail.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Analysis Trigger Section */}
          {archGuardrail?.enabled && (
            <div className="guardrail-trigger-section">
              <h4>🏗️ Trigger Arkitekturanalyse</h4>
              <p>
                Velg et repository og la en AI-agent analysere kodebasen som en erfaren
                software-arkitekt. Det opprettes et GitHub-issue med detaljerte forbedringsforslag.
              </p>

              <div className="trigger-controls">
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
                  disabled={!selectedRepo || triggerState[selectedRepo] === 'loading'}
                  onClick={() => triggerArchitectureAnalysis(selectedRepo)}
                >
                  {triggerState[selectedRepo] === 'loading'
                    ? '⏳ Oppretter...'
                    : '🚀 Kjør analyse'}
                </button>
              </div>

              {/* Status messages */}
              {selectedRepo && triggerState[selectedRepo] === 'success' && (
                <div className="trigger-result success">
                  <span>✅ Issue opprettet!</span>
                  {triggerResults[selectedRepo]?.issueUrl && (
                    <a
                      href={triggerResults[selectedRepo].issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔗 Åpne issue på GitHub
                    </a>
                  )}
                  {triggerResults[selectedRepo]?.note && (
                    <p className="trigger-note">{triggerResults[selectedRepo].note}</p>
                  )}
                </div>
              )}
              {selectedRepo && triggerState[selectedRepo] === 'error' && (
                <div className="trigger-result error">
                  <span>❌ {triggerResults[selectedRepo]?.error || 'Noe gikk galt'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GuardrailsPanel;
