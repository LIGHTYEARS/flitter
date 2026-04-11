// Bash tool executor — runs shell commands via Bun.spawn.
//
// Executes commands in the session's working directory.
// Captures stdout and stderr, respects timeout, and returns
// combined output as the tool result.

import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import type { BashStreamEvent } from '../state/types';
import { log } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
const MAX_TIMEOUT_MS = 600_000; // 10 minutes
const MAX_OUTPUT_CHARS = 30_000;

export class BashExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const command = input.command;
    if (typeof command !== 'string' || command.trim().length === 0) {
      return { content: 'Error: command parameter is required and must be a non-empty string.', isError: true };
    }

    let timeoutMs = DEFAULT_TIMEOUT_MS;
    if (typeof input.timeout === 'number') {
      timeoutMs = Math.min(Math.max(input.timeout, 1000), MAX_TIMEOUT_MS);
    }

    log.info(`BashExecutor: running command in ${context.cwd}: ${command.slice(0, 200)}`);

    try {
      const proc = Bun.spawn(['bash', '-c', command], {
        cwd: context.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env },
      });

      // Wire abort signal to kill the child process
      let abortHandler: (() => void) | undefined;
      if (context.abortSignal) {
        if (context.abortSignal.aborted) {
          proc.kill();
          return { content: 'Command aborted.', isError: true };
        }
        abortHandler = () => proc.kill();
        context.abortSignal.addEventListener('abort', abortHandler, { once: true });
      }

      // Set up timeout
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeoutMs);
      });

      const exitPromise = proc.exited.then((code) => ({ code }));

      const result = await Promise.race([exitPromise, timeoutPromise]);

      // Clean up abort listener
      if (abortHandler && context.abortSignal) {
        context.abortSignal.removeEventListener('abort', abortHandler);
      }

      if (context.abortSignal?.aborted) {
        return { content: 'Command aborted.', isError: true };
      }

      if (result === 'timeout') {
        proc.kill();
        return {
          content: `Command timed out after ${timeoutMs}ms.`,
          isError: true,
        };
      }

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = result.code;

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + stderr;

      // Truncate if too long
      if (output.length > MAX_OUTPUT_CHARS) {
        output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...(truncated)';
      }

      if (!output) {
        output = exitCode === 0 ? '(no output)' : `Exit code: ${exitCode}`;
      } else if (exitCode !== 0) {
        output += `\nExit code: ${exitCode}`;
      }

      return {
        content: output,
        isError: exitCode !== 0,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`BashExecutor: error: ${msg}`);
      return { content: `Error executing command: ${msg}`, isError: true };
    }
  }

  /**
   * Observable-style non-blocking execution matching AMP's
   * invokeBashTool().subscribe({ next, error, complete }) pattern.
   *
   * Spawns the process and invokes callbacks as events occur:
   * - next: called with each BashStreamEvent (currently once with final result)
   * - error: called if execution throws unexpectedly
   * - complete: called after all next calls finish, signals stream end
   *
   * Returns void — fire-and-forget, matching AMP's Observable semantics.
   *
   * AMP's invokeBashTool runs over IPC, so Observable complete naturally fires
   * after the 75ms showTimer. Flitter's in-process execution is faster, so _run
   * enforces a minimum 75ms delay before calling observer.complete() to ensure
   * the showTimer has fired and the invocation is in bashInvocations[].
   */
  subscribe(
    input: { command: string; timeout?: number },
    context: ToolContext,
    observer: {
      next: (event: BashStreamEvent) => void;
      error: (err: Error) => void;
      complete: () => void;
    },
  ): void {
    const startTime = Date.now();
    this._run(input, context, observer, startTime).catch((err) => {
      observer.error(err instanceof Error ? err : new Error(String(err)));
    });
  }

  /**
   * Minimum elapsed time (ms) before calling observer.complete().
   * Matches the 75ms pending→shown delay in invokeBashCommand's showTimer.
   * AMP's IPC-based Observable naturally exceeds this; Flitter's in-process
   * execution needs an explicit floor to ensure the showTimer fires first.
   */
  private static readonly MIN_COMPLETE_DELAY_MS = 80;

  private async _run(
    input: { command: string; timeout?: number },
    context: ToolContext,
    observer: {
      next: (event: BashStreamEvent) => void;
      error: (err: Error) => void;
      complete: () => void;
    },
    startTime: number,
  ): Promise<void> {
    const { command } = input;
    if (typeof command !== 'string' || command.trim().length === 0) {
      observer.next({ type: 'result', content: 'Error: command parameter is required and must be a non-empty string.', isError: true });
      observer.complete();
      return;
    }

    let timeoutMs = DEFAULT_TIMEOUT_MS;
    if (typeof input.timeout === 'number') {
      timeoutMs = Math.min(Math.max(input.timeout, 1000), MAX_TIMEOUT_MS);
    }

    log.info(`BashExecutor.subscribe: running command in ${context.cwd}: ${command.slice(0, 200)}`);

    try {
      const proc = Bun.spawn(['bash', '-c', command], {
        cwd: context.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env },
      });

      // Wire abort signal to kill the child process
      let abortHandler: (() => void) | undefined;
      if (context.abortSignal) {
        if (context.abortSignal.aborted) {
          proc.kill();
          observer.next({ type: 'result', content: 'Command aborted.', isError: true });
          observer.complete();
          return;
        }
        abortHandler = () => proc.kill();
        context.abortSignal.addEventListener('abort', abortHandler, { once: true });
      }

      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeoutMs);
      });

      const exitPromise = proc.exited.then((code) => ({ code }));
      const result = await Promise.race([exitPromise, timeoutPromise]);

      // Clean up abort listener
      if (abortHandler && context.abortSignal) {
        context.abortSignal.removeEventListener('abort', abortHandler);
      }

      if (context.abortSignal?.aborted) {
        observer.next({ type: 'result', content: 'Command aborted.', isError: true });
        observer.complete();
        return;
      }

      if (result === 'timeout') {
        proc.kill();
        observer.next({ type: 'result', content: `Command timed out after ${timeoutMs}ms.`, isError: true });
        observer.complete();
        return;
      }

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = result.code;

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += (output ? '\n' : '') + stderr;

      if (output.length > MAX_OUTPUT_CHARS) {
        output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...(truncated)';
      }

      if (!output) {
        output = exitCode === 0 ? '(no output)' : `Exit code: ${exitCode}`;
      } else if (exitCode !== 0) {
        output += `\nExit code: ${exitCode}`;
      }

      observer.next({ type: 'result', content: output, isError: exitCode !== 0 });

      // Ensure showTimer (75ms) has fired before signaling completion.
      // AMP's IPC Observable naturally has this latency; we add it explicitly.
      const elapsed = Date.now() - startTime;
      if (elapsed < BashExecutor.MIN_COMPLETE_DELAY_MS) {
        await new Promise<void>(resolve =>
          setTimeout(resolve, BashExecutor.MIN_COMPLETE_DELAY_MS - elapsed),
        );
      }
      observer.complete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`BashExecutor.subscribe: error: ${msg}`);
      observer.error(err instanceof Error ? err : new Error(msg));
    }
  }
}
