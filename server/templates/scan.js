'use strict';

/**
 * Scan issue body builder.
 */

/**
 * Build a scan-issue body for a recommendation.
 * @param {object} rec - { title, description, priority, type, marketOpportunity }
 * @param {object} [options]
 * @param {boolean} [options.compact=false] - Use compact format for batch creation
 * @returns {string}
 */
function buildScanIssueBody(rec, { compact = false } = {}) {
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🔵' }[rec.priority] || '⚪';

  if (compact) {
    return `## ${priorityEmoji} ${rec.title}\n\n> Automatisk opprettet av **Evo** — proaktiv skanning.\n\n---\n\n### 📋 Beskrivelse\n\n${rec.description}\n\n${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n\n` : ''}---\n\n### ✅ Akseptansekriterier\n\n- [ ] Problemet er løst\n- [ ] Endringen er testet\n- [ ] PR er opprettet\n\n---\n\n*Opprettet av Evo • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*`;
  }

  return `## ${priorityEmoji} ${rec.title}

> Automatisk opprettet av **[Evo](https://github.com/FrankBurmo/evo)** — proaktiv skanning.

---

### 📋 Beskrivelse

${rec.description}

${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n` : ''}

---

### ✅ Akseptansekriterier

- [ ] Problemet beskrevet over er løst
- [ ] Endringen er testet
- [ ] En pull request er opprettet med løsningen

---

*Opprettet av Evo proaktiv skanning • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*
`;
}

module.exports = { buildScanIssueBody };
