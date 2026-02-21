'use strict';

/**
 * Regelbasert repo-analyse – portert og utvidet fra server/index.js
 */
function analyzeRepository(repo) {
  const recommendations = [];

  const daysSinceUpdate = repo.updated_at
    ? Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const openIssues = repo.open_issues_count || 0;
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const isPublic = !repo.private;

  // Dokumentasjon
  if (!repo.description) {
    recommendations.push({
      type: 'documentation',
      priority: 'medium',
      title: 'Legg til beskrivelse',
      description: 'Legg til en tydelig beskrivelse av hva prosjektet gjør.',
      marketOpportunity: 'Tydelig beskrivelse bedrer synligheten i GitHub-søk.',
    });
  }

  if (!repo.homepage && isPublic) {
    recommendations.push({
      type: 'documentation',
      priority: 'low',
      title: 'Legg til nettside/dokumentasjonslenke',
      description: 'Sett en homepage-URL i repo-innstillingene.',
      marketOpportunity: 'Profesjonell nettside øker troverdighet og brukertillit.',
    });
  }

  // Aktivitet
  if (daysSinceUpdate > 180) {
    recommendations.push({
      type: 'activity',
      priority: 'high',
      title: 'Repositoryet er inaktivt',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden. Vurder oppdatering eller arkivering.`,
      marketOpportunity: 'Regelmessige oppdateringer signaliserer aktivt vedlikehold til potensielle brukere.',
    });
  } else if (daysSinceUpdate > 60) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      title: 'Oppdater repositoryet',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden.`,
      marketOpportunity: 'Jevnlig aktivitet holder prosjektet relevant.',
    });
  }

  // Issues
  if (openIssues > 20) {
    recommendations.push({
      type: 'maintenance',
      priority: 'high',
      title: 'Mange åpne issues',
      description: `${openIssues} åpne issues. Vurder triagering og lukking av utdaterte issues.`,
      marketOpportunity: 'Aktivt issue-arbeid viser prosjekthelse og tiltrekker bidragsytere.',
    });
  } else if (openIssues > 10) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      title: 'Håndter åpne issues',
      description: `${openIssues} åpne issues – se gjennom og prioriter.`,
      marketOpportunity: 'Ryddig backlog er et faresignal for aktive brukere.',
    });
  }

  // Synlighet og community
  if (isPublic && stars < 5 && daysSinceUpdate < 90) {
    recommendations.push({
      type: 'visibility',
      priority: 'low',
      title: 'Promoter prosjektet',
      description: 'Del prosjektet i relevante forum, communities og sosiale medier.',
      marketOpportunity: 'Økt synlighet gir flere brukere og potensielle bidragsytere.',
    });
  }

  if (isPublic && stars > 50 && forks < 10) {
    recommendations.push({
      type: 'community',
      priority: 'medium',
      title: 'Tilrettelegg for bidragsytere',
      description: 'Opprett CONTRIBUTING.md og merk enkle issues med "good first issue".',
      marketOpportunity: 'Voksende bidragsyterbas akselererer produktutviklingen.',
    });
  }

  // Lisens
  if (isPublic && !repo.license) {
    recommendations.push({
      type: 'documentation',
      priority: 'high',
      title: 'Legg til lisens',
      description: 'Offentlige repos uten lisens er implisitt "alle rettigheter forbeholdt" og hindrer adopsjon.',
      marketOpportunity: 'MIT/Apache 2.0-lisens er industristandarden for åpen kildekode og øker adopsjon markant.',
    });
  }

  return {
    repo: {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars,
      forks,
      openIssues,
      updatedAt: repo.updated_at,
      visibility: repo.private ? 'private' : 'public',
      license: repo.license?.spdx_id || null,
    },
    recommendations,
  };
}

module.exports = { analyzeRepository };
