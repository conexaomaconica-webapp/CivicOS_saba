// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { PluginLifecycleManager } from '../plugin-lifecycle';

describe('Plugin Lifecycle Manager', () => {
  it('should discover and advance a plugin through the happy path', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('test-plugin');

    expect(lm.getState('test-plugin')).toBe('discovered');

    lm.advanceToActive('test-plugin');
    expect(lm.getState('test-plugin')).toBe('active');

    // Check history includes all intermediate states
    const entry = lm.getEntry('test-plugin');
    expect(entry).toBeDefined();
    expect(entry!.history.length).toBe(6); // discovered->installed->validated->migrated->licensed->configured->active = 6 transitions
  });

  it('should throw on illegal transitions', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('test-plugin');

    // discovered -> active is illegal (must go through intermediate states)
    expect(() => lm.transition('test-plugin', 'active')).toThrow('Illegal lifecycle transition');
  });

  it('should allow transition to error from any active state', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('test-plugin');
    lm.transition('test-plugin', 'installed');
    lm.transition('test-plugin', 'error', 'Something broke');

    expect(lm.getState('test-plugin')).toBe('error');
    const entry = lm.getEntry('test-plugin');
    expect(entry!.error).toBe('Something broke');
  });

  it('should track transition events via listeners', () => {
    const lm = new PluginLifecycleManager();
    const events: string[] = [];

    lm.onTransition((pluginId, from, to) => {
      events.push(`${pluginId}:${from}->${to}`);
    });

    lm.discover('my-plugin');
    lm.transition('my-plugin', 'installed');
    lm.transition('my-plugin', 'validated');

    expect(events).toEqual([
      'my-plugin:discovered->installed',
      'my-plugin:installed->validated',
    ]);
  });

  it('should list plugins by state', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('plugin-a');
    lm.discover('plugin-b');

    lm.advanceToActive('plugin-a');

    expect(lm.listByState('active')).toEqual(['plugin-a']);
    expect(lm.listByState('discovered')).toEqual(['plugin-b']);
  });

  it('should prevent duplicate discoveries', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('test-plugin');

    expect(() => lm.discover('test-plugin')).toThrow('already tracked');
  });

  it('should allow disable and re-enable cycle', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('test-plugin');
    lm.advanceToActive('test-plugin');

    lm.transition('test-plugin', 'disabled');
    expect(lm.getState('test-plugin')).toBe('disabled');

    lm.transition('test-plugin', 'active');
    expect(lm.getState('test-plugin')).toBe('active');
  });

  it('should transition active -> deprecated -> removed', () => {
    const lm = new PluginLifecycleManager();
    lm.discover('old-plugin');
    lm.advanceToActive('old-plugin');

    lm.transition('old-plugin', 'deprecated');
    expect(lm.getState('old-plugin')).toBe('deprecated');

    lm.transition('old-plugin', 'removed');
    expect(lm.getState('old-plugin')).toBe('removed');
  });
});
