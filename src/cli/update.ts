import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { packageRoot, resolveRepoOrchPaths } from '../repo-orch/paths.js';
import { installRepoOrch } from '../repo-orch/install.js';

export type UpdateOptions = { quiet?: boolean };
export type UpdateResult = { ok: boolean; message: string };

export async function runUpdate(opts: UpdateOptions = {}): Promise<UpdateResult> {
  const log = (line: string): void => {
    if (!opts.quiet) process.stdout.write(`${line}\n`);
  };

  const managerieRoot = packageRoot();
  const { agentTerrariumRoot } = resolveRepoOrchPaths();

  log('1/6 git pull agent-terrarium...');
  if (!(await isGitRepo(agentTerrariumRoot))) {
    return {
      ok: false,
      message: `agent-terrarium at ${agentTerrariumRoot} is not a git checkout. Skipping.`,
    };
  }
  const pullA = await run('git', ['pull', '--ff-only'], agentTerrariumRoot);
  if (pullA.code !== 0) {
    return {
      ok: false,
      message: `git pull failed in agent-terrarium: ${oneLine(pullA.stderr || pullA.stdout)}`,
    };
  }
  log(`   ${oneLine(pullA.stdout || pullA.stderr) || '(no output)'}`);

  log('2/6 rebuild agent-terrarium...');
  const pnpmInstall = await run('pnpm', ['install'], agentTerrariumRoot);
  if (pnpmInstall.code !== 0) {
    return { ok: false, message: `pnpm install failed: ${oneLine(pnpmInstall.stderr)}` };
  }
  const pnpmBuild = await run('pnpm', ['-r', 'build'], agentTerrariumRoot);
  if (pnpmBuild.code !== 0) {
    return { ok: false, message: `pnpm -r build failed: ${oneLine(pnpmBuild.stderr)}` };
  }

  log('3/6 git pull claude-managerie...');
  if (!(await isGitRepo(managerieRoot))) {
    return {
      ok: false,
      message: `claude-managerie at ${managerieRoot} is not a git checkout. Skipping.`,
    };
  }
  const pullM = await run('git', ['pull', '--ff-only'], managerieRoot);
  if (pullM.code !== 0) {
    return {
      ok: false,
      message: `git pull failed in claude-managerie: ${oneLine(pullM.stderr || pullM.stdout)}`,
    };
  }
  log(`   ${oneLine(pullM.stdout || pullM.stderr) || '(no output)'}`);

  log('4/6 rebuild claude-managerie...');
  const npmInstall = await run('npm', ['install'], managerieRoot);
  if (npmInstall.code !== 0) {
    return { ok: false, message: `npm install failed: ${oneLine(npmInstall.stderr)}` };
  }
  const npmBuild = await run('npm', ['run', 'build'], managerieRoot);
  if (npmBuild.code !== 0) {
    return { ok: false, message: `npm run build failed: ${oneLine(npmBuild.stderr)}` };
  }

  log('5/6 restart daemon with fresh code...');
  const reinstall = await installRepoOrch(true);
  if (reinstall.code !== 0) {
    return {
      ok: false,
      message: `daemon restart failed: ${oneLine(reinstall.stderr || reinstall.stdout)}`,
    };
  }

  // `claude plugin update` is version-gated and is a no-op when the plugin
  // version hasn't been bumped. Uninstall + reinstall forces Claude Code to
  // re-copy the plugin tree (including hooks.json) into its cache.
  log('6/6 refresh Claude Code plugin cache...');
  const uninstall = await run('claude', ['plugin', 'uninstall', 'repo-orch@repo-orch'], managerieRoot);
  if (uninstall.code !== 0 && !/not installed|no plugin/i.test(uninstall.stderr + uninstall.stdout)) {
    return {
      ok: false,
      message: `claude plugin uninstall failed: ${oneLine(uninstall.stderr || uninstall.stdout)}`,
    };
  }
  const install = await run('claude', ['plugin', 'install', 'repo-orch@repo-orch'], managerieRoot);
  if (install.code !== 0) {
    return {
      ok: false,
      message: `claude plugin install failed: ${oneLine(install.stderr || install.stdout)}`,
    };
  }

  return {
    ok: true,
    message:
      'update complete. start a fresh `claude` session to pick up the new hooks; next `claude-managerie` invocation uses the new build.',
  };
}

type CommandResult = { code: number | null; stdout: string; stderr: string };

function run(cmd: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
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
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: err.message }));
  });
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await access(path.join(dir, '.git'));
    return true;
  } catch {
    return false;
  }
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
