import { connect, type Socket } from 'node:net';
import readline from 'node:readline';
import type { EventEnvelope, SessionRow } from '../types.js';

export type Health = { eventsLast24h: number; sessions: number };

export type SocketClient = {
  request<T>(message: unknown, timeoutMs?: number): Promise<T>;
  subscribe(
    onEvent: (event: EventEnvelope) => void,
    onClose: (error: Error | null) => void,
  ): Promise<() => void>;
  close(): void;
};

type Pending = {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
};

export function connectRepoOrchSocket(socketPath: string): Promise<SocketClient> {
  return new Promise((resolve, reject) => {
    const socket: Socket = connect(socketPath);
    const queue: unknown[] = [];
    const pending: Pending[] = [];
    let closed = false;
    let streamHandler: ((event: EventEnvelope) => void) | null = null;
    let closeHandler: ((error: Error | null) => void) | null = null;

    const failPending = (error: Error): void => {
      while (pending.length) {
        const item = pending.shift();
        if (!item) continue;
        clearTimeout(item.timer);
        item.reject(error);
      }
    };

    socket.once('error', reject);
    socket.once('connect', () => {
      socket.off('error', reject);
      const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });

      rl.on('line', (line) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch {
          return;
        }

        if (isEventMessage(parsed)) {
          streamHandler?.(parsed.event);
          return;
        }

        const waiter = pending.shift();
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(parsed);
        } else {
          queue.push(parsed);
        }
      });

      rl.on('close', () => {
        closed = true;
        failPending(new Error('repo-orch socket closed'));
        closeHandler?.(null);
      });

      socket.on('error', (error) => {
        closed = true;
        failPending(error);
        closeHandler?.(error);
      });

      function request<T>(message: unknown, timeoutMs = 1500): Promise<T> {
          if (closed) return Promise.reject(new Error('repo-orch socket closed'));
          const queued = queue.shift();
          if (queued !== undefined) return Promise.resolve(queued as T);

          socket.write(`${JSON.stringify(message)}\n`);
          return new Promise<T>((res, rej) => {
            const timer = setTimeout(() => {
              const idx = pending.findIndex((item) => item.timer === timer);
              if (idx >= 0) pending.splice(idx, 1);
              rej(new Error('repo-orch socket request timed out'));
            }, timeoutMs);
            pending.push({
              resolve: (value) => res(value as T),
              reject: rej,
              timer,
            });
          });
      }

      resolve({
        request,
        async subscribe(onEvent, onClose): Promise<() => void> {
          streamHandler = onEvent;
          closeHandler = onClose;
          const ack = await request<{ ok?: true; error?: string }>({ op: 'subscribe' });
          if (ack.error || !ack.ok) throw new Error(ack.error ?? 'subscribe failed');
          return () => {
            streamHandler = null;
            closeHandler = null;
            socket.end();
          };
        },
        close() {
          socket.end();
        },
      });
    });
  });
}

export async function ping(socketPath: string): Promise<boolean> {
  const client = await connectRepoOrchSocket(socketPath);
  try {
    const msg = await client.request<{ pong?: true }>({ op: 'ping' });
    return msg.pong === true;
  } finally {
    client.close();
  }
}

export async function readStatus(socketPath: string): Promise<SessionRow[]> {
  const client = await connectRepoOrchSocket(socketPath);
  try {
    const msg = await client.request<{ sessions?: SessionRow[]; error?: string }>({ op: 'status' });
    if (msg.error) throw new Error(msg.error);
    return msg.sessions ?? [];
  } finally {
    client.close();
  }
}

export async function readHealth(socketPath: string): Promise<Health | null> {
  const client = await connectRepoOrchSocket(socketPath);
  try {
    const msg = await client.request<{ health?: Health; error?: string }>({ op: 'health' });
    if (msg.error) throw new Error(msg.error);
    return msg.health ?? null;
  } finally {
    client.close();
  }
}

function isEventMessage(value: unknown): value is { event: EventEnvelope } {
  return typeof value === 'object' && value !== null && 'event' in value;
}
