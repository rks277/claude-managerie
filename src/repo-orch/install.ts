import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolveRepoOrchPaths } from './paths.js';
import { ping, readHealth } from './socket-client.js';
import type { SetupStatus } from '../types.js';

export type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const paths = resolveRepoOrchPaths();
  const [cliExists, socketExists, pluginExists] = await Promise.all([
    exists(paths.cliPath),
    exists(paths.socket),
    exists(paths.pluginRoot),
  ]);

  let daemonResponding = false;
  let health: SetupStatus['health'] = null;
  let error: string | null = null;

  if (socketExists) {
    try {
      daemonResponding = await ping(paths.socket);
      health = await readHealth(paths.socket);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    cliPath: paths.cliPath,
    cliExists,
    socketPath: paths.socket,
    socketExists,
    daemonResponding,
    pluginExists,
    health,
    error,
  };
}

export function runRepoOrchCommand(args: string[]): Promise<CommandResult> {
  const paths = resolveRepoOrchPaths();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [paths.cliPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (err) => resolve({ code: null, stdout, stderr: err.message }));
  });
}

export function installRepoOrch(force = false): Promise<CommandResult> {
  return runRepoOrchCommand(force ? ['install', '--force'] : ['install']);
}

export function doctorRepoOrch(): Promise<CommandResult> {
  return runRepoOrchCommand(['doctor']);
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
