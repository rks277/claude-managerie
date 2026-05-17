import os from 'node:os';
import path from 'node:path';

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
    process.env.AGENT_TERRARIUM_ROOT ?? path.resolve(process.cwd(), '..', 'agent-terrarium');

  return {
    home,
    root: path.join(home, '.repo-orch'),
    socket: path.join(home, '.repo-orch', 'daemon.sock'),
    pluginRoot: path.join(home, '.claude', 'plugins', 'repo-orch'),
    agentTerrariumRoot,
    cliPath: path.join(agentTerrariumRoot, 'packages', 'cli', 'dist', 'index.js'),
  };
}
