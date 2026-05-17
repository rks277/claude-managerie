import { resolveRepoOrchPaths } from '../repo-orch/paths.js';
import { getSetupStatus, installRepoOrch } from '../repo-orch/install.js';
import { ping } from '../repo-orch/socket-client.js';
import { ClaudeCliMissingError, PluginRegistrationError, registerPlugin } from './register-plugin.js';

export type SetupOptions = { force?: boolean; quiet?: boolean };
export type SetupResult = { ok: boolean; message: string };

const PING_TIMEOUT_MS = 10_000;
const PING_INTERVAL_MS = 250;

export async function runSetup(opts: SetupOptions = {}): Promise<SetupResult> {
  const paths = resolveRepoOrchPaths();
  const log = (line: string): void => {
    if (!opts.quiet) process.stdout.write(`${line}\n`);
  };

  log('1/4 installing repo-orch daemon...');
  const install = await installRepoOrch(opts.force ?? false);
  const alreadyInstalled =
    install.code !== 0 && /already exists/i.test(install.stderr) && !opts.force;
  if (install.code !== 0 && !alreadyInstalled) {
    return {
      ok: false,
      message: `repo-orch install failed (exit ${install.code}): ${install.stderr || install.stdout || 'unknown'}`.trim(),
    };
  }
  if (alreadyInstalled) log('   (daemon already installed; reusing)');

  log('2/4 waiting for daemon socket...');
  const up = await waitForPing(paths.socket);
  if (!up) {
    return {
      ok: false,
      message: `daemon never responded to ping at ${paths.socket}. Check ~/.repo-orch/logs/daemon.log`,
    };
  }

  log('3/4 registering Claude Code plugin...');
  try {
    const reg = await registerPlugin(paths);
    if (reg.marketplaceOutput) log(`   ${reg.marketplaceOutput}`);
    if (reg.installOutput) log(`   ${reg.installOutput}`);
  } catch (err) {
    if (err instanceof ClaudeCliMissingError) return { ok: false, message: err.message };
    if (err instanceof PluginRegistrationError) {
      return { ok: false, message: err.message };
    }
    throw err;
  }

  log('4/4 verifying...');
  const status = await getSetupStatus();
  const problems: string[] = [];
  if (!status.cliExists) problems.push(`agent-terrarium CLI missing at ${status.cliPath}`);
  if (!status.socketExists) problems.push(`daemon socket missing at ${status.socketPath}`);
  if (!status.daemonResponding) problems.push('daemon not responding to ping');
  if (!status.pluginExists) problems.push(`plugin tree missing at ${paths.pluginRoot}`);
  if (problems.length) return { ok: false, message: `verification failed: ${problems.join('; ')}` };

  return {
    ok: true,
    message:
      'setup complete. open Claude Code in any repo; a creature should appear within ~1s. (If hooks do not fire, see README "troubleshooting".)',
  };
}

async function waitForPing(socketPath: string): Promise<boolean> {
  const deadline = Date.now() + PING_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if (await ping(socketPath)) return true;
    } catch {
      // socket not ready yet
    }
    await sleep(PING_INTERVAL_MS);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
