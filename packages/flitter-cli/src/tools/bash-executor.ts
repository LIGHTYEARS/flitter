// Bash tool executor — runs shell commands via Bun.spawn.
//
// Executes commands in the session's working directory.
// Captures stdout and stderr, respects timeout, and returns
// combined output as the tool result.

import type { ToolExecutor, ToolResult, ToolContext } from './executor';
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

      // Set up timeout
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeoutMs);
      });

      const exitPromise = proc.exited.then((code) => ({ code }));

      const result = await Promise.race([exitPromise, timeoutPromise]);

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
}
