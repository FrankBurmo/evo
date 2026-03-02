/**
 * packages/cli/src/copilot.ts — GitHub Copilot Models API-klient for CLI.
 * Bruker brukerens eksisterende PAT med models:read-scope.
 */
import type { Recommendation } from '../../../packages/core';

const COPILOT_ENDPOINT = 'https://api.githubcopilot.com/inference/chat/completions';

interface AnalyzeWithAIParams {
  token: string;
  model: string;
  repo: Record<string, unknown>;
  existingRecs?: string[];
}

interface AIAnalysisResult {
  summary: string;
  recommendations: Recommendation[];
}

/**
 * Analyser ett repo med AI og returner et kort sammendrag + prioriterte anbefalinger.
 */
export async function analyzeWithAI({
  token,
  model,
  repo,
  existingRecs = [],
}: AnalyzeWithAIParams): Promise<AIAnalysisResult> {
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

  const userPrompt = `GitHub-repo: ${repo.fullName as string}
Språk: ${(repo.language as string) || 'ukjent'}
Beskrivelse: ${(repo.description as string) || '(ingen)'}
Synlighet: ${repo.visibility as string}
Stjerner: ${repo.stars as number}, Forks: ${repo.forks as number}, Åpne issues: ${repo.openIssues as number}
Siste aktivitet: ${repo.updatedAt ? new Date(repo.updatedAt as string).toLocaleDateString('nb-NO') : 'ukjent'}
Lisens: ${(repo.license as string) || 'ingen'}

Allerede identifiserte problemer (ikke gjenta disse):
${existingRecs.length > 0 ? existingRecs.map((r) => `- ${r}`).join('\n') : '(ingen)'}

Fokuser på dypere tekniske og strategiske forbedringer som ikke allerede er dekket.`;

  const response = await fetch(COPILOT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Uventet svar fra Copilot API – kunne ikke parse JSON');
  }

  return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
}
