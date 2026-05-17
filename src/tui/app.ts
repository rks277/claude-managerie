import { ansi } from './ansi.js';
import { TerminalGarden, type RenderModel } from './renderer.js';
import {
  createCreatureIdentity,
  isCurrentCreatureIdentity,
  type CreatureIdentity,
} from '../creatures/generator.js';
import { getSetupStatus } from '../repo-orch/install.js';
import { runSetup } from '../cli/setup.js';
import { resolveRepoOrchPaths } from '../repo-orch/paths.js';
import { connectRepoOrchSocket, readStatus } from '../repo-orch/socket-client.js';
import { readConfig, writeConfig, type AppConfig } from '../state/config-store.js';
import { SessionStore } from '../state/session-store.js';
import type { SetupStatus } from '../types.js';

export class ManagerieApp {
  private readonly store = new SessionStore();
  private readonly renderer = new TerminalGarden();
  private config: AppConfig = { selectedRepoPaths: null, setupSkipped: false, creatureIdentities: {} };
  private setup: SetupStatus | null = null;
  private connected = false;
  private paused = false;
  private selectionMode = false;
  private selectionCursor = 0;
  private message = 'starting...';
  private renderTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;

  async start(): Promise<void> {
    this.config = await readConfig();
    process.stdout.write(`${ansi.hideCursor}${ansi.clear}`);
    this.bindInput();
    await this.refreshSetup();
    await this.syncSessions();
    void this.subscribe();

    this.renderTimer = setInterval(() => this.render(), 100);
    this.syncTimer = setInterval(() => void this.syncSessions(), 5000);
  }

  async stop(): Promise<void> {
    this.renderTimer && clearInterval(this.renderTimer);
    this.syncTimer && clearInterval(this.syncTimer);
    this.unsubscribe?.();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdout.write(`${ansi.showCursor}${ansi.reset}\n`);
  }

  private bindInput(): void {
    if (!process.stdin.isTTY) return;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => {
      const key = data.toString();
      if (key === 'q' || data[0] === 3) {
        void this.stop().then(() => process.exit(0));
      } else if (key === 'p') {
        this.paused = !this.paused;
        this.message = this.paused ? 'paused' : 'animation resumed';
      } else if (key === 'o' || key === '\r') {
        this.selectionMode = !this.selectionMode;
        this.message = this.selectionMode ? 'select repos for the garden' : 'selection closed';
      } else if (this.selectionMode && (key === 'j' || data[0] === 14)) {
        this.moveSelection(1);
      } else if (this.selectionMode && (key === 'k' || data[0] === 16)) {
        this.moveSelection(-1);
      } else if (this.selectionMode && key === ' ') {
        void this.toggleSelectedRepo();
      } else if (this.selectionMode && key === 'a') {
        void this.selectAllRepos();
      } else if (this.selectionMode && key === 'n') {
        void this.selectNoRepos();
      } else if (key === 'r') {
        this.message = 'refreshing daemon state...';
        void this.refreshSetup().then(() => this.syncSessions());
      } else if (key === 'i') {
        void this.runSetup();
      } else if (key === 's') {
        this.config.setupSkipped = true;
        void writeConfig(this.config);
        this.message = 'setup marked skipped for now';
      }
    });
  }

  private async refreshSetup(): Promise<void> {
    this.setup = await getSetupStatus();
    this.connected = this.setup.daemonResponding;
    this.message = this.connected
      ? 'connected | o select repos | q quit | r refresh | p pause'
      : 'offline | i setup | o select repos | r refresh | s skip setup | q quit';
  }

  private async syncSessions(): Promise<void> {
    const paths = resolveRepoOrchPaths();
    try {
      const rows = await readStatus(paths.socket);
      this.store.replaceAll(rows);
      await this.ensureCreatureIdentities([...new Set(rows.map((row) => row.repoPath))]);
      this.connected = true;
      this.message = rows.length
        ? `synced ${rows.length} sessions | o select repos | q quit | r refresh | p pause`
        : 'daemon online; no sessions yet | open Claude Code in a repo';
    } catch (err) {
      this.connected = false;
      this.message = err instanceof Error ? err.message : String(err);
    }
  }

  private async subscribe(): Promise<void> {
    const paths = resolveRepoOrchPaths();
    try {
      const client = await connectRepoOrchSocket(paths.socket);
      this.unsubscribe = await client.subscribe(
        (event) => {
          this.store.applyEvent(event);
          this.connected = true;
          this.message = `${event.type} ${shortRepo(event.repoPath)}`;
        },
        () => {
          this.connected = false;
          this.unsubscribe = null;
          setTimeout(() => void this.syncSessions().then(() => this.subscribe()), 1500);
        },
      );
    } catch {
      this.connected = false;
      setTimeout(() => void this.subscribe(), 3000);
    }
  }

  private async runSetup(): Promise<void> {
    this.message = 'running setup...';
    this.render();
    const result = await runSetup({ quiet: true });
    this.message = result.ok ? 'setup complete; refreshing...' : `setup failed: ${result.message}`.replace(/\s+/g, ' ');
    await this.refreshSetup();
    await this.syncSessions();
  }

  private render(): void {
    const selected =
      this.config.selectedRepoPaths === null ? null : new Set(this.config.selectedRepoPaths);
    const allRepos = this.allRepos();
    const model: RenderModel = {
      setup: this.setup,
      connected: this.connected,
      creatures: this.store.creatures(selected),
      creatureIdentities: new Map(Object.entries(this.config.creatureIdentities)),
      allRepos,
      selectedRepoPaths: selected,
      selectionMode: this.selectionMode,
      selectionCursor: this.selectionCursor,
      message: this.message,
      paused: this.paused,
    };
    process.stdout.write(this.renderer.render(model));
  }

  private allRepos(): string[] {
    return [...new Set(this.store.rows().map((row) => row.repoPath))].sort();
  }

  private moveSelection(delta: number): void {
    const repos = this.allRepos();
    if (!repos.length) return;
    this.selectionCursor = (this.selectionCursor + delta + repos.length) % repos.length;
  }

  private async toggleSelectedRepo(): Promise<void> {
    const repos = this.allRepos();
    const repo = repos[this.selectionCursor];
    if (!repo) return;
    const selected = new Set(this.config.selectedRepoPaths ?? repos);
    if (selected.has(repo)) selected.delete(repo);
    else selected.add(repo);
    this.config.selectedRepoPaths = [...selected].sort();
    await writeConfig(this.config);
    this.message = `${selected.has(repo) ? 'selected' : 'hidden'} ${shortRepo(repo)}`;
  }

  private async selectAllRepos(): Promise<void> {
    this.config.selectedRepoPaths = null;
    await writeConfig(this.config);
    this.message = 'showing all repos';
  }

  private async selectNoRepos(): Promise<void> {
    this.config.selectedRepoPaths = [];
    await writeConfig(this.config);
    this.message = 'hidden all repos';
  }

  private async ensureCreatureIdentities(repoPaths: string[]): Promise<void> {
    let changed = false;
    const used = new Set(
      Object.entries(this.config.creatureIdentities)
        .filter(([, identity]) => isCurrentCreatureIdentity(identity))
        .map(([, identity]) => identitySignature(identity)),
    );

    for (const repoPath of repoPaths) {
      const existing = this.config.creatureIdentities[repoPath];
      if (isCurrentCreatureIdentity(existing)) continue;

      let identity = createCreatureIdentity(repoPath);
      let salt = 1;
      while (used.has(identitySignature(identity))) {
        identity = createCreatureIdentity(repoPath, salt);
        salt += 1;
      }

      this.config.creatureIdentities[repoPath] = identity;
      used.add(identitySignature(identity));
      changed = true;
    }

    if (changed) await writeConfig(this.config);
  }
}

function shortRepo(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? repoPath;
}

function identitySignature(identity: CreatureIdentity): string {
  return [
    identity.species,
    identity.palette,
    identity.detail,
    identity.mark,
    identity.motion,
  ].join(':');
}
