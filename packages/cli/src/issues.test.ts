// NB: createIssue oppretter sin eigen Octokit-instans. Vi tester buildIssueBody
// via eksportert createIssue-funksjon (dryRun) og direkte intern logikk.

const issuesPath = require.resolve('./issues');

describe('CLI: issues', () => {
  let createIssue;

  beforeEach(() => {
    delete require.cache[issuesPath];
    ({ createIssue } = require('./issues'));
  });

  describe('createIssue (dryRun)', () => {
    it('returnerer dry-run-streng utan å kontakte GitHub', async () => {
      const result = await createIssue({
        token: 'fake',
        owner: 'user',
        repo: 'myrepo',
        recommendation: { title: 'Legg til CI', description: 'Sett opp CI', priority: 'high', type: 'ci' },
        dryRun: true,
      });
      expect(result).toContain('[dry-run]');
      expect(result).toContain('user/myrepo');
      expect(result).toContain('Legg til CI');
    });

    it('inkluderer riktig tittelformat', async () => {
      const result = await createIssue({
        token: 'fake',
        owner: 'o',
        repo: 'r',
        recommendation: { title: 'Test', description: '', priority: 'low' },
        dryRun: true,
      });
      expect(result).toContain('[Evo] Test');
    });
  });
});
