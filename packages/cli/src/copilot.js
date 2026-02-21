'use strict';

/**
 * GitHub Copilot Models API-klient
 * Bruker brukerens eksisterende PAT med models:read-scope.
 */

const COPILOT_ENDPOINT = 'https://api.githubcopilot.com/inference/chat/completions';

/**
 * Analyser ett repo med AI og returner et kort sammendrag + prioriterte anbefalinger.
 * @param {object} params
 * @param {string} params.token - GitHub PAT
 * @param {string} params.model - AI-modell, f.eks. 'openai/gpt-4.1'
 * @param {object} params.repo  - Repo-objekt fra analyzeRepository
 * @param {string[]} params.existingRecs - Titler på allerede-funne regelbaserte anbefalinger
 * @returns {Promise<{summary: string, recommendations: Array}>}
 */
async function analyzeWithAI({ token, model, repo, existingRecs = [] }) {
  const systemPrompt = `Du er en erfaren software-arkitekt og produktstrateg.
Analyser dette GitHub-repositoryet og gi 2-4 korte, konkrete forbedringsforslag.
Svar KUN med gyldig JSON i dette formatet (ingen markdown, ingen forklaring utenfor JSON):
{
  "summary": "1-2 setninger om prosjektets status og viktigste forbedringspotensial.",
  "recommendations": [
    {
      "title": "Kort tittel på anbefaling",
      "description": "Konkret beskrivelse av hva som bør gjøres.",
      "priority": "high|medium|low",
      "type": "documentation|testing|ci|security|performance|community|architecture"
    }
  ]
}`;

  const userPrompt = `GitHub-repo: ${repo.fullName}
Språk: ${repo.language || 'ukjent'}
Beskrivelse: ${repo.description || '(ingen)'}
Synlighet: ${repo.visibility}
Stjerner: ${repo.stars}, Forks: ${repo.forks}, Åpne issues: ${repo.openIssues}
Siste aktivitet: ${repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString('nb-NO') : 'ukjent'}
Lisens: ${repo.license || 'ingen'}

Allerede identifiserte problemer (ikke gjenta disse):
${existingRecs.length > 0 ? existingRecs.map(r => `- ${r}`).join('\n') : '(ingen)'}

Fokuser på dypere tekniske og strategiske forbedringer som ikke allerede er dekket.`;

  const response = await fetch(COPILOT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Copilot API feil (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON fra svaret
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Uventet svar fra Copilot API – kunne ikke parse JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeWithAI };
