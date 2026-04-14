/**
 * @flitter/llm — OAuth Callback Server
 *
 * Lightweight HTTP server on 127.0.0.1 that listens for OAuth redirect callbacks.
 * Extracts the authorization code from the callback URL and resolves.
 *
 * @example
 * ```ts
 * const { code, stop } = await startCallbackServer({ port: 53692, path: "/callback" });
 * // code → authorization code from OAuth redirect
 * // stop() → close the server
 * ```
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface CallbackServerOptions {
  /** Port to listen on (default: 0 for auto-assign) */
  port?: number;
  /** Path to listen for callback (default: "/callback") */
  path?: string;
  /** Timeout in ms before giving up (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface CallbackServerResult {
  /** The authorization code extracted from the callback */
  code: string;
  /** The full query parameters from the callback */
  params: URLSearchParams;
}

/**
 * Start a local HTTP callback server and wait for an OAuth redirect.
 *
 * Returns a promise that resolves when the authorization code is received,
 * or rejects on timeout/cancellation/error.
 *
 * The server automatically closes after receiving the callback.
 */
export function startCallbackServer(
  options: CallbackServerOptions = {},
): Promise<CallbackServerResult> & { stop: () => void; port: Promise<number> } {
  const { port = 0, path = "/callback", timeout = 120_000 } = options;

  let server: Server;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let resolvePort: (port: number) => void;
  let settled = false;

  const portPromise = new Promise<number>((resolve) => {
    resolvePort = resolve;
  });

  const resultPromise = new Promise<CallbackServerResult>((resolve, reject) => {
    const cleanup = () => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (server?.listening) {
        server.close();
      }
    };

    // Abort signal
    if (options.signal) {
      if (options.signal.aborted) {
        reject(new Error("OAuth callback cancelled"));
        return;
      }
      options.signal.addEventListener(
        "abort",
        () => {
          cleanup();
          reject(new Error("OAuth callback cancelled"));
        },
        { once: true },
      );
    }

    // Timeout
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`OAuth callback timeout after ${timeout}ms`));
    }, timeout);

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (settled) {
        res.writeHead(400);
        res.end("Already handled");
        return;
      }

      // Parse the URL
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);

      // Only handle the configured path
      if (url.pathname !== path) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      // Check for error response
      const error = url.searchParams.get("error");
      if (error) {
        const errorDesc = url.searchParams.get("error_description") ?? error;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage(errorDesc));
        cleanup();
        reject(new Error(`OAuth error: ${errorDesc}`));
        return;
      }

      // Extract authorization code
      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage("No authorization code received"));
        return;
      }

      // Success
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(successPage());
      cleanup();
      resolve({ code, params: url.searchParams });
    });

    server.on("error", (err) => {
      cleanup();
      reject(err);
    });

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolvePort(addr.port);
      }
    });
  });

  // Attach stop() and port to the promise
  const enhanced = resultPromise as Promise<CallbackServerResult> & {
    stop: () => void;
    port: Promise<number>;
  };
  enhanced.stop = () => {
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (server?.listening) server.close();
  };
  enhanced.port = portPromise;

  return enhanced;
}

// ─── HTML pages ──────────────────────────────────────────

function successPage(): string {
  return `<!DOCTYPE html>
<html><head><title>Authorization Successful</title></head>
<body style="font-family:system-ui;text-align:center;padding:50px">
<h2>Authorization Successful</h2>
<p>You can close this window and return to the terminal.</p>
</body></html>`;
}

function errorPage(message: string): string {
  const escaped = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html><head><title>Authorization Error</title></head>
<body style="font-family:system-ui;text-align:center;padding:50px">
<h2>Authorization Error</h2>
<p>${escaped}</p>
<p>Please close this window and try again.</p>
</body></html>`;
}
