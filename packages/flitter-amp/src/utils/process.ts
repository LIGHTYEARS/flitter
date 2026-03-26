// Agent subprocess management — spawn, monitor, and cleanup

import { spawn, type ChildProcess } from 'node:child_process';
import { log } from './logger';

export interface AgentProcess {
  proc: ChildProcess;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  kill(): void;
}

/**
 * Parse a command string into command + args.
 * Handles quoted arguments: --agent "claude-code --agent"
 */
export function parseCommand(commandStr: string): { command: string; args: string[] } {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const ch of commandStr) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    parts.push(current);
  }

  const [command, ...args] = parts;
  return { command, args };
}

/**
 * Spawn an agent subprocess with stdio piped for ACP communication.
 * stderr is inherited so agent error messages show in our terminal.
 */
export function spawnAgent(command: string, args: string[], cwd: string): AgentProcess {
  log.info(`Spawning agent: ${command} ${args.join(' ')}`);
  log.info(`Working directory: ${cwd}`);

  const proc = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd,
    env: { ...process.env },
  });

  proc.on('error', (err) => {
    log.error(`Agent process error: ${err.message}`);
  });

  proc.on('exit', (code, signal) => {
    if (signal) {
      log.info(`Agent process killed by signal: ${signal}`);
    } else {
      log.info(`Agent process exited with code: ${code}`);
    }
  });

  return {
    proc,
    stdin: proc.stdin!,
    stdout: proc.stdout!,
    kill() {
      if (!proc.killed) {
        log.info('Killing agent process');
        proc.kill('SIGTERM');
        // Force kill after 3 seconds if still alive
        setTimeout(() => {
          if (!proc.killed) {
            log.warn('Agent did not exit, sending SIGKILL');
            proc.kill('SIGKILL');
          }
        }, 3000);
      }
    },
  };
}
