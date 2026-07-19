// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { HealthStatus, IssueSeverity } from '../diagnostics/diagnostics-types';
import { DiagnosticsEngine } from '../diagnostics/diagnostics-engine';
import { DiagnosticsContributorRegistry } from '../diagnostics/diagnostics-contributor';
import { HealthContributorRegistry, HealthAggregator } from '../diagnostics/health-contributor';

describe('Diagnostics Platform (AC-6D)', () => {
  let diagRegistry: DiagnosticsContributorRegistry;
  let healthRegistry: HealthContributorRegistry;
  let healthAggregator: HealthAggregator;
  let engine: DiagnosticsEngine;

  beforeEach(() => {
    diagRegistry = new DiagnosticsContributorRegistry();
    healthRegistry = new HealthContributorRegistry();
    healthAggregator = new HealthAggregator(healthRegistry);
    engine = new DiagnosticsEngine('1.0.0', diagRegistry, healthAggregator);
  });

  describe('HealthAggregator', () => {
    it('should return UNKNOWN if no contributors are registered', async () => {
      const status = await healthAggregator.aggregate();
      expect(status).toBe(HealthStatus.UNKNOWN);
    });

    it('should return UP if all contributors are UP', async () => {
      healthRegistry.register({ id: 'c1', check: () => HealthStatus.UP });
      healthRegistry.register({ id: 'c2', check: () => HealthStatus.UP });
      const status = await healthAggregator.aggregate();
      expect(status).toBe(HealthStatus.UP);
    });

    it('should return DEGRADED if at least one contributor is DEGRADED', async () => {
      healthRegistry.register({ id: 'c1', check: () => HealthStatus.UP });
      healthRegistry.register({ id: 'c2', check: () => HealthStatus.DEGRADED });
      const status = await healthAggregator.aggregate();
      expect(status).toBe(HealthStatus.DEGRADED);
    });

    it('should return DOWN if at least one contributor is DOWN, overriding DEGRADED', async () => {
      healthRegistry.register({ id: 'c1', check: () => HealthStatus.UP });
      healthRegistry.register({ id: 'c2', check: () => HealthStatus.DEGRADED });
      healthRegistry.register({ id: 'c3', check: () => HealthStatus.DOWN });
      const status = await healthAggregator.aggregate();
      expect(status).toBe(HealthStatus.DOWN);
    });

    it('should return DEGRADED if a contributor throws an error', async () => {
      healthRegistry.register({ id: 'c1', check: () => { throw new Error('DB timeout'); } });
      const status = await healthAggregator.aggregate();
      expect(status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('DiagnosticsEngine', () => {
    it('should start with 100 score and deduct based on severity', async () => {
      diagRegistry.register({
        id: 'arch-provider',
        collect: () => ({
          issues: [
            { componentId: 'cap', message: 'Missing cap', severity: IssueSeverity.MAJOR }, // -10
            { componentId: 'ui', message: 'Slow render', severity: IssueSeverity.MINOR }, // -3
          ],
          metrics: {}
        })
      });

      const report = await engine.buildReport();
      expect(report.score).toBe(87); // 100 - 10 - 3
    });

    it('should not drop score below 0', async () => {
      diagRegistry.register({
        id: 'bad-provider',
        collect: () => ({
          issues: Array(10).fill({ componentId: 'sys', message: 'Critical', severity: IssueSeverity.CRITICAL }), // -30 * 10 = -300
          metrics: {}
        })
      });

      const report = await engine.buildReport();
      expect(report.score).toBe(0);
    });

    it('should gracefully handle a contributor throwing an exception by deducting MAJOR', async () => {
      diagRegistry.register({
        id: 'faulty-provider',
        collect: () => { throw new Error('Crash'); }
      });

      const report = await engine.buildReport();
      expect(report.score).toBe(90); // 100 - 10 (MAJOR)
      expect(report.contributors['faulty-provider'].issues[0].message).toContain('Crash');
    });

    it('should record events to timeline', async () => {
      engine.recordEvent('Event 1');
      engine.recordEvent('Event 2');
      const report = await engine.buildReport();
      expect(report.timeline).toHaveLength(2);
      expect(report.timeline[0].message).toBe('Event 1');
    });

    it('should generate an immutable versioned snapshot', async () => {
      const snapshot = await engine.generateSnapshot();
      expect(snapshot.schemaVersion).toBe('1.0');
      expect(snapshot.report.kernelVersion).toBe('1.0.0');
      
      // Attempting to mutate should fail in strict mode (which vitest runs in)
      expect(() => {
        (snapshot as any).schemaVersion = '2.0';
      }).toThrow();
    });
  });
});
