import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type ActivationResult = { ok: boolean; message: string };
export type ActivationTarget = {
  pid: number | null;
  sessionId: string;
  repoPath: string;
};

type Host = 'terminal.app' | 'vscode' | 'iterm2' | 'unknown';

export async function activateTerminalForSession(
  target: ActivationTarget,
): Promise<ActivationResult> {
  const pid = resolvePid(target);
  if (pid === null) {
    return { ok: false, message: `no pid for ${path.basename(target.repoPath)}` };
  }
  const tty = await getTtyForPid(pid);
  if (!tty) return { ok: false, message: 'session has no tty' };

  const { host, comm } = await detectHost(pid);
  switch (host) {
    case 'terminal.app':
      return focusTerminalAppTab(tty);
    case 'vscode':
      return focusVscodeWorkspace(target.repoPath);
    case 'iterm2':
      return { ok: false, message: 'iTerm2 not yet supported' };
    default:
      return { ok: false, message: `unsupported terminal (host: ${comm || 'unknown'})` };
  }
}

// The daemon doesn't always record a pid (older sessions, hook-only ingest).
// Claude Code itself writes one pid file per live session at
// ~/.claude/sessions/<pid>.json with { pid, sessionId, cwd }. Match by
// sessionId first, then fall back to cwd.
function resolvePid(target: ActivationTarget): number | null {
  if (target.pid !== null && target.pid > 0) return target.pid;
  const sessionsDir = path.join(os.homedir(), '.claude', 'sessions');
  let entries: string[];
  try {
    entries = readdirSync(sessionsDir);
  } catch {
    return null;
  }
  let cwdMatch: number | null = null;
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const parsed = JSON.parse(readFileSync(path.join(sessionsDir, entry), 'utf8')) as {
        pid?: unknown;
        sessionId?: unknown;
        cwd?: unknown;
      };
      const pid = typeof parsed.pid === 'number' ? parsed.pid : null;
      if (pid === null) continue;
      if (parsed.sessionId === target.sessionId) return pid;
      if (cwdMatch === null && parsed.cwd === target.repoPath) cwdMatch = pid;
    } catch {
      // ignore unreadable files
    }
  }
  return cwdMatch;
}

async function getTtyForPid(pid: number): Promise<string | null> {
  const { code, stdout } = await runCmd('ps', ['-p', String(pid), '-o', 'tty=']);
  if (code !== 0) return null;
  const tty = stdout.trim();
  return tty && tty !== '??' ? tty : null;
}

async function detectHost(pid: number): Promise<{ host: Host; comm: string }> {
  let cur: number | null = pid;
  let lastComm = '';
  for (let i = 0; i < 16 && cur !== null && cur > 1; i += 1) {
    const info = await getProcInfo(cur);
    if (!info) break;
    lastComm = info.comm;
    const lower = info.comm.toLowerCase();
    if (lower === 'terminal' || lower.endsWith('/terminal')) {
      return { host: 'terminal.app', comm: info.comm };
    }
    if (lower === 'iterm2' || lower.includes('/iterm2') || lower === 'iterm') {
      return { host: 'iterm2', comm: info.comm };
    }
    if (
      lower === 'code' ||
      lower === 'code helper' ||
      lower.includes('code helper') ||
      lower.includes('electron') ||
      lower.includes('cursor')
    ) {
      return { host: 'vscode', comm: info.comm };
    }
    cur = info.ppid;
  }
  return { host: 'unknown', comm: lastComm };
}

async function getProcInfo(pid: number): Promise<{ ppid: number; comm: string } | null> {
  const { code, stdout } = await runCmd('ps', ['-p', String(pid), '-o', 'ppid=,comm=']);
  if (code !== 0) return null;
  const match = stdout.trim().match(/^\s*(\d+)\s+(.+)$/);
  if (!match) return null;
  return { ppid: Number(match[1]), comm: match[2].trim() };
}

async function focusTerminalAppTab(tty: string): Promise<ActivationResult> {
  const script = `tell application "Terminal"
    repeat with w in every window
        repeat with t in every tab of w
            if (tty of t) is equal to "/dev/${tty}" then
                set selected of t to true
                set frontmost of w to true
                activate
                return "ok"
            end if
        end repeat
    end repeat
    return "not_found"
end tell`;
  const { code, stdout, stderr } = await runOsascript(script);
  if (code !== 0) {
    return { ok: false, message: `osascript: ${(stderr.trim() || 'failed').slice(0, 80)}` };
  }
  if (stdout.trim() === 'ok') return { ok: true, message: `focused ${tty}` };
  return { ok: false, message: `couldn't find Terminal window for ${tty}` };
}

async function focusVscodeWorkspace(repoPath: string): Promise<ActivationResult> {
  const repoName = path.basename(repoPath) || repoPath;
  const codeResult = await runCmd('code', ['-r', repoPath]);
  if (codeResult.code === 0) {
    await runOsascript('tell application "Visual Studio Code" to activate');
    return { ok: true, message: `focused VSCode (${repoName}) — pick terminal pane manually` };
  }
  const opened = await runCmd('open', ['-a', 'Visual Studio Code', repoPath]);
  if (opened.code === 0) {
    return { ok: true, message: `VSCode activated (${repoName}) — code CLI missing` };
  }
  return {
    ok: false,
    message: `couldn't activate VSCode: ${(opened.stderr.trim() || 'unknown').slice(0, 80)}`,
  };
}

function runCmd(
  cmd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => {
      stdout += String(d);
    });
    proc.stderr?.on('data', (d) => {
      stderr += String(d);
    });
    proc.on('error', (err) => resolve({ code: -1, stdout, stderr: err.message }));
    proc.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function runOsascript(
  script: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('osascript', ['-']);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => {
      stdout += String(d);
    });
    proc.stderr.on('data', (d) => {
      stderr += String(d);
    });
    proc.on('error', (err) => resolve({ code: -1, stdout, stderr: err.message }));
    proc.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    proc.stdin.write(script);
    proc.stdin.end();
  });
}
