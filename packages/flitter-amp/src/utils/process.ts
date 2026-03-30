// Agent subprocess management — spawn via Bun.spawn, monitor, and cleanup

import { log } from './logger';

/**
 * Abstraction over a spawned agent subprocess.
 * Hides the underlying Bun.Subprocess — consumers interact only through
 * typed stdin/stdout streams, kill(), and onExit().
 */
export interface AgentProcess {
  /** WritableStream that feeds the agent's stdin (for ndJsonStream). */
  stdin: WritableStream<Uint8Array>;
  /** ReadableStream from the agent's stdout (for ndJsonStream). */
  stdout: ReadableStream<Uint8Array>;
  /** Terminate the agent process (SIGTERM, then SIGKILL after 3 s). */
  kill(): void;
  /**
   * Register a callback that fires once when the agent exits.
   * `code` is the exit code (null if killed by signal).
   * `signal` is the signal name (null if exited normally).
   */
  onExit(cb: (code: number | null, signal: string | null) => void): void;
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
 * Minimal interface for Bun's FileSink (returned by Bun.spawn with stdin: 'pipe').
 * Extracted as a named interface to avoid the `as any` cast when passing proc.stdin.
 */
interface BunFileSink {
  write(data: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer): number;
  flush(): void;
  end(error?: Error): void;
}

/**
 * Wrap a Bun FileSink into a standard WritableStream<Uint8Array>.
 * ndJsonStream expects a WritableStream, but Bun.spawn stdin returns a FileSink.
 */
function fileSinkToWritableStream(sink: BunFileSink): WritableStream<Uint8Array> {
  return new WritableStream<Uint8Array>({
    write(chunk) {
      sink.write(chunk);
      sink.flush();
    },
    close() {
      sink.end();
    },
    abort() {
      sink.end();
    },
  });
}

/**
 * Spawn an agent subprocess via Bun.spawn with stdio piped for ACP communication.
 * stderr is piped and forwarded to our logger to avoid corrupting the TUI.
 */
export function spawnAgent(command: string, args: string[], cwd: string): AgentProcess {
  log.info(`Spawning agent: ${command} ${args.join(' ')}`);
  log.info(`Working directory: ${cwd}`);

  const proc = Bun.spawn([command, ...args], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
    env: process.env,
  });

  // Drain stderr to logger (async, fire-and-forget)
  if (proc.stderr) {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value, { stream: true }).split('\n');
          for (const line of lines) {
            const trimmed = line.trimEnd();
            if (trimmed.length > 0) {
              log.debug(`[agent] ${trimmed}`);
            }
          }
        }
      } catch {
        // stderr stream closed — expected on process exit
      }
    })();
  }

  // proc.stdin is a Bun FileSink when spawned with stdin: 'pipe'.
  // The BunFileSink interface matches its shape without requiring a cast.
  const stdinStream = fileSinkToWritableStream(proc.stdin as BunFileSink);

  return {
    stdin: stdinStream,
    stdout: proc.stdout as ReadableStream<Uint8Array>,
    kill() {
      if (!proc.killed) {
        log.info('Killing agent process');
        proc.kill();
        setTimeout(() => {
          if (!proc.killed) {
            log.warn('Agent did not exit, sending SIGKILL');
            proc.kill(9);
          }
        }, 3000);
      }
    },
    onExit(cb) {
      proc.exited.then(() => {
        const code = proc.exitCode;
        const signal = proc.signalCode ?? null;
        if (signal) {
          log.info(`Agent process killed by signal: ${signal}`);
        } else {
          log.info(`Agent process exited with code: ${code}`);
        }
        cb(code, signal);
      });
    },
  };
}
