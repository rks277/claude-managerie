import { describe, expect, it } from 'vitest';
import { aggregateCreatureState, creatureStatusLabel, needsUserAction } from './session-store.js';
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

  it('awaiting_input stays awake (not attention) — that is normal end-of-turn', () => {
    expect(aggregateCreatureState([{ ...base, state: 'awaiting_input', pid: process.pid }])).toBe('awake');
  });
});

describe('creatureStatusLabel', () => {
  it('sleeping when no live sessions', () => {
    expect(creatureStatusLabel([])).toBe('sleeping');
    expect(creatureStatusLabel([{ ...base, state: 'ended' }])).toBe('sleeping');
  });

  it('working, dnd when any session is running', () => {
    expect(creatureStatusLabel([{ ...base, state: 'running', pid: process.pid }])).toBe('working, dnd');
  });

  it('awaiting instructions when session is awaiting_input', () => {
    expect(creatureStatusLabel([{ ...base, state: 'awaiting_input', pid: process.pid }])).toBe(
      'awaiting instructions',
    );
  });

  it('needs attention beats everything', () => {
    expect(
      creatureStatusLabel([
        { ...base, state: 'running', pid: process.pid },
        { ...base, sessionId: 's2', state: 'awaiting_permission', pid: process.pid },
      ]),
    ).toBe('needs attention');
  });

  it('awaiting instructions beats working, dnd when both are present', () => {
    expect(
      creatureStatusLabel([
        { ...base, state: 'awaiting_input', pid: process.pid },
        { ...base, sessionId: 's2', state: 'running', pid: process.pid },
      ]),
    ).toBe('awaiting instructions');
  });
});

describe('needsUserAction', () => {
  it('queues repos waiting on input or permissions', () => {
    expect(needsUserAction([{ ...base, state: 'awaiting_input', pid: process.pid }])).toBe(true);
    expect(needsUserAction([{ ...base, state: 'awaiting_permission', pid: process.pid }])).toBe(true);
  });

  it('does not queue running or sleeping repos', () => {
    expect(needsUserAction([{ ...base, state: 'running', pid: process.pid }])).toBe(false);
    expect(needsUserAction([{ ...base, state: 'ended' }])).toBe(false);
  });
});
