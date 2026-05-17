import { existsSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CreatureState, EventEnvelope, RepoCreature, SessionRow, SessionState } from '../types.js';

const ACTIVE_SESSION_CACHE_MS = 1500;

type ActiveClaudeSessions = {
  checkedAt: number;
  sessionIds: Set<string>;
  repoPaths: Set<string>;
};

let activeSessionCache: ActiveClaudeSessions = {
  checkedAt: 0,
  sessionIds: new Set(),
  repoPaths: new Set(),
};

export class SessionStore {
  private sessions = new Map<string, SessionRow>();

  replaceAll(rows: SessionRow[]): void {
    this.sessions.clear();
    for (const row of rows) this.sessions.set(row.sessionId, row);
  }

  applyEvent(event: EventEnvelope): void {
    const existing = this.sessions.get(event.sessionId);
    if (event.type === 'session.started') {
      this.sessions.set(event.sessionId, {
        sessionId: event.sessionId,
        repoPath: event.repoPath,
        source: event.source,
        state: 'running',
        startedAt: event.occurredAt,
        endedAt: null,
        model: typeof event.payload.model === 'string' ? event.payload.model : null,
        transcriptPath: null,
        pid: typeof event.payload.pid === 'number' ? event.payload.pid : null,
      });
      return;
    }

    if (!existing) return;

    if (event.type === 'session.ended') {
      this.sessions.set(event.sessionId, { ...existing, state: 'ended', endedAt: event.occurredAt });
      return;
    }

    if (event.type === 'session.state_changed') {
      const to = event.payload.to;
      if (isSessionState(to)) this.sessions.set(event.sessionId, { ...existing, state: to });
    }
  }

  rows(): SessionRow[] {
    return [...this.sessions.values()];
  }

  creatures(selectedRepoPaths: Set<string> | null): RepoCreature[] {
    const byRepo = groupByRepo(this.rows());
    const repoPaths = [...byRepo.keys()].sort();
    return repoPaths
      .filter((repoPath) => selectedRepoPaths === null || selectedRepoPaths.has(repoPath))
      .map((repoPath) => {
        const sessions = byRepo.get(repoPath) ?? [];
        return {
          repoPath,
          state: aggregateCreatureState(sessions),
          sessions,
        };
      });
  }
}

export function aggregateCreatureState(rows: SessionRow[]): CreatureState {
  const liveRows = rows.filter(isLiveSession);
  if (liveRows.some((row) => row.state === 'awaiting_input' || row.state === 'awaiting_permission')) {
    return 'attention';
  }
  if (liveRows.some((row) => row.state === 'running')) return 'awake';
  return 'sleeping';
}

export function isLiveSession(row: SessionRow): boolean {
  if (row.state === 'ended' || row.state === 'unknown' || row.endedAt !== null) return false;
  if (row.pid === null || row.pid <= 0) return hasActiveClaudeCodeSession(row);

  return isLivePid(row.pid);
}

function hasActiveClaudeCodeSession(row: SessionRow): boolean {
  const active = readActiveClaudeSessions();
  return active.sessionIds.has(row.sessionId) || active.repoPaths.has(row.repoPath);
}

function readActiveClaudeSessions(now = Date.now()): ActiveClaudeSessions {
  if (now - activeSessionCache.checkedAt < ACTIVE_SESSION_CACHE_MS) return activeSessionCache;

  const next: ActiveClaudeSessions = {
    checkedAt: now,
    sessionIds: new Set(),
    repoPaths: new Set(),
  };
  const sessionsDir = path.join(os.homedir(), '.claude', 'sessions');
  if (!existsSync(sessionsDir)) {
    activeSessionCache = next;
    return next;
  }

  for (const entry of readdirSync(sessionsDir)) {
    if (!entry.endsWith('.json')) continue;
    const status = readClaudeSessionStatus(path.join(sessionsDir, entry));
    if (!status || !isLivePid(status.pid)) continue;
    if (status.sessionId) next.sessionIds.add(status.sessionId);
    if (status.cwd) next.repoPaths.add(status.cwd);
  }

  activeSessionCache = next;
  return next;
}

function readClaudeSessionStatus(filePath: string): { pid: number; sessionId?: string; cwd?: string } | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as {
      pid?: unknown;
      sessionId?: unknown;
      cwd?: unknown;
    };
    if (typeof parsed.pid !== 'number') return null;
    return {
      pid: parsed.pid,
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
      cwd: typeof parsed.cwd === 'string' ? parsed.cwd : undefined,
    };
  } catch {
    return null;
  }
}

function isLivePid(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'EPERM'
    );
  }
}

function groupByRepo(rows: SessionRow[]): Map<string, SessionRow[]> {
  const grouped = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.repoPath) ?? [];
    existing.push(row);
    grouped.set(row.repoPath, existing);
  }
  return grouped;
}

function isSessionState(value: unknown): value is SessionState {
  return (
    value === 'unknown' ||
    value === 'running' ||
    value === 'awaiting_input' ||
    value === 'awaiting_permission' ||
    value === 'ended'
  );
}
