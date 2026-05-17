import { mkdtemp, writeFile, mkdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeCliMissingError, PluginRegistrationError, registerPlugin } from './register-plugin.js';
import type { RepoOrchPaths } from '../repo-orch/paths.js';

async function makeFakePaths(): Promise<RepoOrchPaths> {
  const home = await mkdtemp(path.join(tmpdir(), 'managerie-test-'));
  return {
    home,
    root: path.join(home, '.repo-orch'),
    socket: path.join(home, '.repo-orch', 'daemon.sock'),
    pluginRoot: path.join(home, '.claude', 'plugins', 'repo-orch'),
    agentTerrariumRoot: path.join(home, 'agent-terrarium'),
    cliPath: path.join(home, 'agent-terrarium', 'packages', 'cli', 'dist', 'index.js'),
  };
}

/**
 * Builds a tempdir, drops a fake `claude` script in it that records its argv
 * to a log file and exits with the configured code, then patches PATH.
 */
async function withFakeClaude(
  spec: { exitCode?: number; stdout?: string; stderr?: string; missing?: boolean },
  body: (logPath: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'fake-claude-'));
  const logPath = path.join(dir, 'invocations.log');
  const originalPath = process.env.PATH ?? '';

  if (!spec.missing) {
    const script = `#!/usr/bin/env bash
echo "$@" >> "${logPath}"
${spec.stdout ? `printf '%s' ${JSON.stringify(spec.stdout)}` : ''}
${spec.stderr ? `printf '%s' ${JSON.stringify(spec.stderr)} >&2` : ''}
exit ${spec.exitCode ?? 0}
`;
    const scriptPath = path.join(dir, 'claude');
    await writeFile(scriptPath, script, 'utf8');
    await chmod(scriptPath, 0o755);
  }

  // When simulating missing claude, set PATH to ONLY our (empty) sandbox dir
  // so the real claude on the host PATH isn't picked up.
  process.env.PATH = spec.missing ? dir : `${dir}:${originalPath}`;
  try {
    await body(logPath);
  } finally {
    process.env.PATH = originalPath;
  }
}

async function readLog(logPath: string): Promise<string[]> {
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(logPath, 'utf8');
    return raw.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('registerPlugin', () => {
  let paths: RepoOrchPaths;

  beforeEach(async () => {
    paths = await makeFakePaths();
  });

  it('invokes `claude plugin marketplace add` then `claude plugin install`', async () => {
    await withFakeClaude({ stdout: 'ok' }, async (logPath) => {
      const result = await registerPlugin(paths);
      const calls = await readLog(logPath);
      expect(calls).toEqual([
        '--version',
        `plugin marketplace add ${paths.pluginRoot}`,
        'plugin install repo-orch@repo-orch',
      ]);
      expect(result.marketplaceOutput).toBe('ok');
      expect(result.installOutput).toBe('ok');
    });
  });

  it('throws ClaudeCliMissingError when claude is not on PATH', async () => {
    await withFakeClaude({ missing: true }, async () => {
      await expect(registerPlugin(paths)).rejects.toBeInstanceOf(ClaudeCliMissingError);
    });
  });

  it('throws PluginRegistrationError when marketplace add fails', async () => {
    // First call (--version) must succeed, second (marketplace add) must fail.
    // We use a stateful fake by writing an invocation counter into the script.
    const dir = await mkdtemp(path.join(tmpdir(), 'fake-claude-'));
    const counter = path.join(dir, 'counter');
    await writeFile(counter, '0', 'utf8');
    const scriptPath = path.join(dir, 'claude');
    await writeFile(
      scriptPath,
      `#!/usr/bin/env bash
n=$(cat "${counter}")
n=$((n+1))
echo $n > "${counter}"
if [[ $n -eq 1 ]]; then exit 0; fi
echo "marketplace boom" >&2
exit 5
`,
      'utf8',
    );
    await chmod(scriptPath, 0o755);
    const originalPath = process.env.PATH ?? '';
    process.env.PATH = `${dir}:${originalPath}`;
    try {
      const err = await registerPlugin(paths).catch((e) => e);
      expect(err).toBeInstanceOf(PluginRegistrationError);
      expect((err as PluginRegistrationError).stage).toBe('marketplace');
    } finally {
      process.env.PATH = originalPath;
    }
  });
});
