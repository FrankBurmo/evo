// Mock console-metoder for å fange output
let consoleOutput = [];
let stderrOutput = [];
let stdoutOutput = [];

vi.spyOn(console, 'log').mockImplementation((...args) => {
  consoleOutput.push(args.join(' '));
});
vi.spyOn(console, 'error').mockImplementation((...args) => {
  stderrOutput.push(args.join(' '));
});
vi.spyOn(process.stdout, 'write').mockImplementation((text) => {
  stdoutOutput.push(text);
  return true;
});

const {
  printBanner,
  printError,
  printInfo,
  printSuccess,
  printRepoResult,
  printSummary,
} = require('../src/output');

describe('CLI: output', () => {
  beforeEach(() => {
    consoleOutput = [];
    stderrOutput = [];
    stdoutOutput = [];
    vi.clearAllMocks();
    // Re-mock etter clearAllMocks
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      stderrOutput.push(args.join(' '));
    });
    vi.spyOn(process.stdout, 'write').mockImplementation((text) => {
      stdoutOutput.push(text);
      return true;
    });
  });

  describe('printBanner', () => {
    it('skriver banner uten å krasje', () => {
      expect(() => printBanner('0.1.0')).not.toThrow();
      expect(consoleOutput.length).toBeGreaterThan(0);
    });

    it('inkluderer versjonsinformasjon', () => {
      printBanner('1.2.3');
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('1.2.3');
    });
  });

  describe('printError', () => {
    it('skriver feilmelding til stderr', () => {
      printError('Noe gikk galt');
      expect(stderrOutput.join('')).toContain('Noe gikk galt');
    });
  });

  describe('printInfo', () => {
    it('skriver infotekst', () => {
      printInfo('Starter analyse...');
      expect(consoleOutput.join('')).toContain('Starter analyse...');
    });
  });

  describe('printSuccess', () => {
    it('skriver suksessmelding', () => {
      printSuccess('Ferdig!');
      expect(consoleOutput.join('')).toContain('Ferdig!');
    });
  });

  describe('printRepoResult', () => {
    it('viser repo-info med navn og badges', () => {
      printRepoResult({
        repo: {
          name: 'test-repo',
          description: 'Testbeskrivelse',
          stars: 10,
          forks: 2,
          openIssues: 3,
          language: 'JavaScript',
          visibility: 'public',
        },
        recommendations: [],
        aiSummary: null,
      });
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('test-repo');
      expect(allOutput).toContain('offentlig');
    });

    it('viser prosjekttype-label når den finnes', () => {
      printRepoResult({
        repo: {
          name: 'web-project',
          description: null,
          stars: 0,
          forks: 0,
          openIssues: 0,
          language: 'JavaScript',
          visibility: 'public',
          projectTypeLabel: '🌐 Web-app',
        },
        recommendations: [],
        aiSummary: null,
      });
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('🌐 Web-app');
    });

    it('viser anbefalinger', () => {
      printRepoResult({
        repo: {
          name: 'test-repo',
          description: null,
          stars: 0,
          forks: 0,
          openIssues: 0,
          language: null,
          visibility: 'public',
        },
        recommendations: [
          { title: 'Legg til README', description: 'Mangler README', priority: 'high' },
        ],
        aiSummary: null,
      });
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('Legg til README');
    });

    it('viser AI-sammendrag', () => {
      printRepoResult({
        repo: {
          name: 'ai-repo',
          description: null,
          stars: 0,
          forks: 0,
          openIssues: 0,
          language: null,
          visibility: 'public',
        },
        recommendations: [],
        aiSummary: 'Prosjektet mangler tester og CI.',
      });
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('AI-analyse');
      expect(allOutput).toContain('Prosjektet mangler tester og CI.');
    });

    it('viser «alt ser bra ut» ved null anbefalinger', () => {
      printRepoResult({
        repo: {
          name: 'perfect-repo',
          description: 'Perfekt!',
          stars: 100,
          forks: 20,
          openIssues: 0,
          language: 'TypeScript',
          visibility: 'public',
        },
        recommendations: [],
        aiSummary: null,
      });
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('Ingen anbefalinger');
    });
  });

  describe('printSummary', () => {
    it('viser sammendrag med totaler', () => {
      printSummary(
        [
          { repo: { name: 'a' }, recommendations: [{ priority: 'high' }] },
          { repo: { name: 'b' }, recommendations: [{ priority: 'medium' }, { priority: 'low' }] },
        ],
        { createIssues: false, dryRun: false, elapsed: 5000 },
      );
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('Sammendrag');
      expect(allOutput).toContain('2'); // 2 repos
      expect(allOutput).toContain('3'); // 3 recs
      expect(allOutput).toContain('5.0'); // 5.0s
    });

    it('viser issues-info når createIssues er true', () => {
      printSummary(
        [{ repo: { name: 'a' }, recommendations: [{ priority: 'high', issueUrl: 'https://...' }] }],
        { createIssues: true, dryRun: false, elapsed: 1000 },
      );
      const allOutput = consoleOutput.join('\n');
      expect(allOutput).toContain('opprettet');
    });
  });
});
