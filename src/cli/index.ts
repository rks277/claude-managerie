import { doctorRepoOrch } from '../repo-orch/install.js';
import { runSetup } from './setup.js';
import { runUpdate } from './update.js';
import { startTui } from './tui-entry.js';

const USAGE = `claude-managerie — terminal terrarium for Claude Code sessions

Usage:
  claude-managerie            start the TUI
  claude-managerie setup      one-shot install + plugin registration (idempotent)
  claude-managerie setup -f   re-run setup, forcing a daemon reinstall
  claude-managerie update     git pull + rebuild both repos, restart daemon
  claude-managerie doctor     print agent-terrarium daemon health
  claude-managerie help       show this help
`;

export async function dispatch(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv.slice(2);
  switch (cmd) {
    case undefined:
      await startTui();
      return;
    case 'setup': {
      const force = rest.includes('--force') || rest.includes('-f');
      const result = await runSetup({ force });
      process.stdout.write(`\n${result.ok ? 'OK' : 'FAILED'}: ${result.message}\n`);
      process.exit(result.ok ? 0 : 1);
      return;
    }
    case 'update': {
      const result = await runUpdate();
      process.stdout.write(`\n${result.ok ? 'OK' : 'FAILED'}: ${result.message}\n`);
      process.exit(result.ok ? 0 : 1);
      return;
    }
    case 'doctor': {
      const result = await doctorRepoOrch();
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.code ?? 1);
      return;
    }
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(USAGE);
      return;
    default:
      process.stderr.write(`unknown command: ${cmd}\n\n${USAGE}`);
      process.exit(2);
  }
}
