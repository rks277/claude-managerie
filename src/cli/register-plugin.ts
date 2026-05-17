import { spawn } from 'node:child_process';
import type { RepoOrchPaths } from '../repo-orch/paths.js';

const PLUGIN_KEY = 'repo-orch@repo-orch';

export type RegisterResult = {
  marketplaceOutput: string;
  installOutput: string;
};

export class ClaudeCliMissingError extends Error {
  constructor() {
    super(
      'claude CLI is not on PATH. Install Claude Code (https://docs.claude.com/en/docs/claude-code), then re-run setup.',
    );
    this.name = 'ClaudeCliMissingError';
  }
}

export class PluginRegistrationError extends Error {
  constructor(public readonly stage: 'marketplace' | 'install', message: string) {
    super(message);
    this.name = 'PluginRegistrationError';
  }
}

/**
 * Registers the repo-orch plugin with Claude Code by shelling out to the
 * official `claude plugin` subcommands. Both commands are naturally idempotent:
 * re-adding a marketplace or re-installing an installed plugin exits 0 with a
 * "already ..." notice.
 *
 * This is preferred over writing ~/.claude/plugins/*.json directly because
 * Claude Code's on-disk schema is version-dependent and undocumented.
 */
export async function registerPlugin(paths: RepoOrchPaths): Promise<RegisterResult> {
  if (!(await hasClaudeCli())) throw new ClaudeCliMissingError();

  const marketplace = await runClaude(['plugin', 'marketplace', 'add', paths.pluginRoot]);
  if (marketplace.code !== 0) {
    throw new PluginRegistrationError(
      'marketplace',
      `claude plugin marketplace add failed (exit ${marketplace.code}): ${marketplace.stderr || marketplace.stdout || 'unknown'}`,
    );
  }

  const install = await runClaude(['plugin', 'install', PLUGIN_KEY]);
  if (install.code !== 0) {
    throw new PluginRegistrationError(
      'install',
      `claude plugin install failed (exit ${install.code}): ${install.stderr || install.stdout || 'unknown'}`,
    );
  }

  return {
    marketplaceOutput: oneLine(marketplace.stdout || marketplace.stderr),
    installOutput: oneLine(install.stdout || install.stderr),
  };
}

async function hasClaudeCli(): Promise<boolean> {
  const probe = await runClaude(['--version']);
  return probe.code === 0;
}

type CommandResult = { code: number | null; stdout: string; stderr: string };

function runClaude(args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
    child.on('error', () => resolve({ code: 127, stdout, stderr: 'claude CLI not found on PATH' }));
  });
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
