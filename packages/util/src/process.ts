/**
 * Child process wrapper utilities
 *
 * Provides Promise-based spawn wrapper with timeout and AbortSignal support
 *
 * @example
 * ```ts
 * import { spawn } from '@flitter/util';
 * const result = await spawn('git', ['status', '--porcelain']);
 * if (result.exitCode === 0) console.log(result.stdout);
 * ```
 */

import { execFile } from "node:child_process";

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
  signal?: AbortSignal;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function spawn(
  command: string,
  args: string[],
  options?: SpawnOptions,
): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve, reject) => {
    const child = execFile(
      command,
      args,
      {
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : undefined,
        timeout: options?.timeout,
        maxBuffer: options?.maxBuffer ?? 10 * 1024 * 1024,
        encoding: "utf-8",
        signal: options?.signal,
      },
      (error, stdout, stderr) => {
        if (error) {
          // ENOENT = command not found, EACCES = permission denied
          if ("code" in error && (error.code === "ENOENT" || error.code === "EACCES")) {
            reject(error);
            return;
          }
          // Timeout or signal-killed: error.killed or error.signal
          if (error.killed || error.signal) {
            reject(error);
            return;
          }
          // AbortError
          if (error.name === "AbortError") {
            reject(error);
            return;
          }
          // maxBuffer exceeded
          if ("code" in error && error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
            reject(error);
            return;
          }
          // Non-zero exit code -- resolve, don't reject
          resolve({
            stdout: (stdout ?? "") as string,
            stderr: (stderr ?? "") as string,
            exitCode: typeof (error as any).status === "number"
              ? (error as any).status
              : (child.exitCode ?? 1),
          });
          return;
        }
        resolve({
          stdout: (stdout ?? "") as string,
          stderr: (stderr ?? "") as string,
          exitCode: 0,
        });
      },
    );
  });
}
