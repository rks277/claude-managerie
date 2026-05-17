export type SessionState =
  | 'unknown'
  | 'running'
  | 'awaiting_input'
  | 'awaiting_permission'
  | 'ended';

export type CreatureState = 'sleeping' | 'awake' | 'attention';

export type SessionRow = {
  sessionId: string;
  repoPath: string;
  source: 'claude-code';
  state: SessionState;
  startedAt: string;
  endedAt: string | null;
  model: string | null;
  transcriptPath: string | null;
  pid: number | null;
};

export type EventType =
  | 'session.started'
  | 'session.ended'
  | 'session.state_changed'
  | 'prompt.submitted'
  | 'assistant.turn_completed'
  | 'tool.used'
  | 'permission.requested'
  | 'permission.resolved'
  | 'notification.received';

export type EventEnvelope = {
  eventId: string;
  type: EventType;
  source: 'claude-code';
  sessionId: string;
  repoPath: string;
  occurredAt: string;
  ingestedAt: string;
  payload: Record<string, unknown>;
};

export type SetupStatus = {
  cliPath: string;
  cliExists: boolean;
  socketPath: string;
  socketExists: boolean;
  daemonResponding: boolean;
  pluginExists: boolean;
  health: { eventsLast24h: number; sessions: number } | null;
  error: string | null;
};

export type RepoCreature = {
  repoPath: string;
  state: CreatureState;
  statusLabel: string;
  needsUserAction: boolean;
  sessions: SessionRow[];
};
