import { describe, expect, it } from 'vitest';
import { aggregateCreatureState } from './session-store.js';
import type { SessionRow } from '../types.js';

const base: SessionRow = {
  sessionId: 's1',
  repoPath: '/repo',
  source: 'claude-code',
  state: 'running',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: null,
  model: null,
  transcriptPath: null,
  pid: null,
};

describe('aggregateCreatureState', () => {
  it('sleeps with no rows or ended rows', () => {
    expect(aggregateCreatureState([])).toBe('sleeping');
    expect(aggregateCreatureState([{ ...base, state: 'ended' }])).toBe('sleeping');
  });

  it('sleeps for unknown sessions and rows without a live pid', () => {
    expect(aggregateCreatureState([{ ...base, state: 'unknown', pid: process.pid }])).toBe('sleeping');
    expect(aggregateCreatureState([{ ...base, state: 'running', pid: null }])).toBe('sleeping');
    expect(aggregateCreatureState([{ ...base, state: 'running', pid: 999_999_999 }])).toBe('sleeping');
  });

  it('wakes for running sessions with a live pid', () => {
    expect(aggregateCreatureState([{ ...base, state: 'running', pid: process.pid }])).toBe('awake');
  });

  it('attention wins over awake', () => {
    expect(
      aggregateCreatureState([
        { ...base, state: 'running', pid: process.pid },
        { ...base, sessionId: 's2', state: 'awaiting_permission', pid: process.pid },
      ]),
    ).toBe('attention');
  });
});
