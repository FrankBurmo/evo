import React, { useState } from 'react';

const ENGINEERING_ITEMS = [
  {
    id: 'cicd-maturity',
    name: 'CI/CD-modenhet',
    description:
      'Analyser pipeline-oppsett, automatiseringsgrad, testgater, deploy-strategi og identifiser flaskehalser i leveranseprosessen',
    icon: '⚙️',
    category: 'cicd',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'dora-assessment',
    name: 'DORA-metrikker & Leveransehastighet',
    description:
      'Vurder deployment frequency, lead time for changes, change failure rate og MTTR — og foreslå tiltak for å nå elite-nivå',
    icon: '📊',
    category: 'dora',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'observability',
    name: 'Observability & Monitorering',
    description:
      'Evaluer logging, metrikker, alerting og tracing — basert på OpenTelemetry-standarder og SRE best practices',
    icon: '🔭',
    category: 'observability',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'release-hygiene',
    name: 'Release-hygiene & Versjonering',
    description:
      'Gjennomgå branching-strategi, versjonering (semver), changelog-praksis, feature flags og release-prosess',
    icon: '🏷️',
    category: 'release',
    canTrigger: true,
    defaultEnabled: true,
  },
  {
    id: 'community-health',
    name: 'Community-helse & Bærekraft',
    description:
      'Mål bus factor, contributor diversity, responsivitet på issues/PRer og langsiktig bærekraft basert på CHAOSS-rammeverket',
    icon: '🌱',
    category: 'community',
    canTrigger: true,
    defaultEnabled: false,
  },
];

function EngineeringVelocityPanel({ repos, token }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('engvelocity_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return ENGINEERING_ITEMS.map(item => ({
        ...item,
        enabled: parsed[item.id] !== undefined ? parsed[item.id] : item.defaultEnabled,
      }));
    }
    return ENGINEERING_ITEMS.map(item => ({ ...item, enabled: item.defaultEnabled }));
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
      localStorage.setItem('engvelocity_config', JSON.stringify(config));
      return updated;
    });
  };

  const triggerAction = async (actionId, repoFullName) => {
    if (!repoFullName || !actionId) return;
    const [owner, repoName] = repoFullName.split('/');
    const key = `${actionId}:${repoFullName}`;

    setTriggerState(prev => ({ ...prev, [key]: 'loading' }));

    try {
      const response = await fetch(`/api/engineering-velocity/${actionId}`, {
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
    <div className="engvelocity-panel">
      <div className="engvelocity-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="engvelocity-header-left">
          <h3>⚡ Leveransekvalitet</h3>
          <span className="engvelocity-badge">{enabledCount}/{items.length} aktive</span>
        </div>
        <button className="engvelocity-toggle-btn">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="engvelocity-content">
          <p className="engvelocity-description">
            Leveransekvalitet handler om ingeniørteamets evne til å levere programvare raskt,
            pålitelig og bærekraftig. Basert på DORA-forskning og CHAOSS-rammeverket — trigger
            en AI-agent som oppretter et GitHub-issue med konkrete anbefalinger.
          </p>

          <div className="engvelocity-list">
            {items.map(item => (
              <div
                key={item.id}
                className={`engvelocity-item ${item.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="engvelocity-info">
                  <div className="engvelocity-name">
                    <span className="engvelocity-icon">{item.icon}</span>
                    <span>{item.name}</span>
                    <span className={`engvelocity-category ecat-${item.category}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="engvelocity-desc">{item.description}</p>
                </div>
                <div className="engvelocity-controls">
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

          {enabledTriggerable.length > 0 && (
            <div className="engvelocity-trigger-section">
              <h4>⚡ Trigger Leveransekvalitet-analyse</h4>
              <p>
                Velg en analyse og et repository. En AI-agent oppretter et GitHub-issue
                med en DORA/CHAOSS-basert gjennomgang og handlingsbare forbedringstiltak.
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
                  className="btn-trigger engvelocity-btn"
                  disabled={
                    !selectedAction ||
                    !selectedRepo ||
                    triggerState[`${selectedAction}:${selectedRepo}`] === 'loading'
                  }
                  onClick={() => triggerAction(selectedAction, selectedRepo)}
                >
                  {triggerState[`${selectedAction}:${selectedRepo}`] === 'loading'
                    ? '⏳ Oppretter...'
                    : '⚡ Kjør analyse'}
                </button>
              </div>

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

export default EngineeringVelocityPanel;
