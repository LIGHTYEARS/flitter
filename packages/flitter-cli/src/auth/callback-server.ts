// Local OAuth callback server for flitter-cli.
//
// Starts a temporary HTTP server to receive OAuth redirect callbacks.
// Used by ChatGPT/Codex and Antigravity OAuth flows.

import { log } from '../utils/logger';

/**
 * Start a local HTTP server and wait for an OAuth callback.
 *
 * The server listens on the specified port and waits for a GET request
 * with a `code` query parameter. Returns the authorization code.
 *
 * @param port - Port to listen on (e.g., 1455 for ChatGPT, 36742 for Antigravity)
 * @param timeoutMs - Maximum time to wait for callback (default: 5 minutes)
 * @returns The authorization code from the callback URL
 */
export async function waitForOAuthCallback(
  port: number,
  timeoutMs: number = 5 * 60_000,
): Promise<{ code: string; state?: string }> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.stop();
        reject(new Error(`OAuth callback timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    const server = Bun.serve({
      port,
      fetch(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          const desc = url.searchParams.get('error_description') ?? error;
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            server.stop();
            reject(new Error(`OAuth error: ${desc}`));
          }
          return new Response(
            `<html><body><h2>Authentication failed</h2><p>${desc}</p><p>You can close this window.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } },
          );
        }

        if (code) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            // Delay server stop to allow response to be sent
            setTimeout(() => server.stop(), 500);
            resolve({ code, state: state ?? undefined });
          }
          return new Response(
            '<html><body><h2>Authentication successful!</h2><p>You can close this window and return to flitter-cli.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }

        return new Response('Waiting for OAuth callback...', { status: 200 });
      },
    });

    log.info(`OAuth callback server listening on http://localhost:${port}`);
  });
}
