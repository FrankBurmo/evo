/* global describe, it, expect */
'use strict';

const {
  scanState,
  resetScanState,
  getScanStatus,
  getScanResults,
} = require('./scan-service');

describe('scan-service state management', () => {
  beforeEach(() => {
    resetScanState();
  });

  describe('resetScanState', () => {
    it('resetter tilstand til idle', () => {
      scanState.status = 'running';
      scanState.results = [{ repo: 'test' }];
      resetScanState();
      expect(scanState.status).toBe('idle');
      expect(scanState.results).toEqual([]);
      expect(scanState.startedAt).toBeNull();
    });
  });

  describe('getScanStatus', () => {
    it('returnerer snapshot av scan-tilstand', () => {
      const status = getScanStatus();
      expect(status.status).toBe('idle');
      expect(status.resultCount).toBe(0);
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('error');
    });

    it('reflekterer oppdatert tilstand', () => {
      scanState.status = 'running';
      scanState.progress.current = 3;
      scanState.progress.total = 10;
      const status = getScanStatus();
      expect(status.status).toBe('running');
      expect(status.progress.current).toBe(3);
    });
  });

  describe('getScanResults', () => {
    it('returnerer tomme resultater for idle tilstand', () => {
      const results = getScanResults();
      expect(results.status).toBe('idle');
      expect(results.results).toEqual([]);
      expect(results.summary.reposScanned).toBe(0);
    });

    it('filtrerer resultater etter minPriority', () => {
      scanState.results = [
        {
          repo: { name: 'r1' },
          recommendations: [
            { title: 'A', priority: 'high' },
            { title: 'B', priority: 'low' },
          ],
          issuesCreated: [],
        },
      ];

      const results = getScanResults('high');
      expect(results.results[0].recommendations).toHaveLength(1);
      expect(results.results[0].recommendations[0].title).toBe('A');
    });

    it('beregner summary korrekt', () => {
      scanState.results = [
        {
          repo: { name: 'r1' },
          recommendations: [{ title: 'A', priority: 'high' }],
          issuesCreated: [{ status: 'created' }, { status: 'skipped' }],
        },
        {
          repo: { name: 'r2' },
          recommendations: [{ title: 'B', priority: 'medium' }, { title: 'C', priority: 'low' }],
          issuesCreated: [],
        },
      ];

      const results = getScanResults();
      expect(results.summary.reposScanned).toBe(2);
      expect(results.summary.totalRecommendations).toBe(3);
      expect(results.summary.totalIssuesAttempted).toBe(2);
      expect(results.summary.issuesCreated).toBe(1);
    });
  });
});
