import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type RepoOrchPaths = {
  home: string;
  root: string;
  socket: string;
  pluginRoot: string;
  agentTerrariumRoot: string;
  cliPath: string;
};

export function resolveRepoOrchPaths(): RepoOrchPaths {
  const home = os.homedir();
  const agentTerrariumRoot =
    process.env.AGENT_TERRARIUM_ROOT ?? path.resolve(packageRoot(), '..', 'agent-terrarium');

  return {
    home,
    root: path.join(home, '.repo-orch'),
    socket: path.join(home, '.repo-orch', 'daemon.sock'),
    pluginRoot: path.join(home, '.claude', 'plugins', 'repo-orch'),
    agentTerrariumRoot,
    cliPath: path.join(agentTerrariumRoot, 'packages', 'cli', 'dist', 'index.js'),
  };
}

export function packageRoot(): string {
  // This file lives at <pkg>/dist/repo-orch/paths.js after build (or <pkg>/src/repo-orch/paths.ts in dev).
  // Either way, two levels up is the package root.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}
