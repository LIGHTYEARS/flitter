async function LXT(T, R, a = 300000) {
  if (J.info("Starting local HTTP server to receive API key from browser"), !KP) throw Error("No port selected. Call generateLoginLink first.");
  let e = KP;
  return J.info("Callback server listening on port", {
    port: KP
  }), new Promise((t, r) => {
    let h = !1,
      i = EXT((A, l) => {
        if (l.setHeader("Access-Control-Allow-Origin", "ampcode.com"), l.setHeader("Access-Control-Allow-Methods", "GET"), A.url?.startsWith("/auth/callback")) {
          let o = new URL(A.url, `http://127.0.0.1:${e}`),
            n = o.searchParams.get("accessToken") ?? o.searchParams.get("apiKey");
          if (o.searchParams.get("authToken") !== T) {
            r(Error("Invalid authentication token"));
            return;
          }
          if (n) {
            if (J.info("Received API key from server", {
              accessToken: n.substring(0, 8)
            }), l.writeHead(200, {
              "Content-Type": "text/html"
            }), l.end(`
						<!DOCTYPE html>
						<html>
							<head>
								<title>Amp CLI Login Success</title>
								<style>
									:root {
										--background: #fafaf8;
										--foreground: #0b0d0b;
										--muted: #6b7280;
										--accent: currentColor;
										--accent-bg: rgba(128, 128, 128, 0.1);
									}
									@media (prefers-color-scheme: dark) {
										:root {
											--background: #0b0d0b;
											--foreground: #f6fff5;
											--muted: #9ca3af;
											--accent: currentColor;
											--accent-bg: rgba(200, 200, 200, 0.1);
										}
									}
									* { margin: 0; padding: 0; box-sizing: border-box; }
									body {
										font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
										min-height: 100vh;
										display: flex;
										align-items: center;
										justify-content: center;
										background-color: var(--background);
										color: var(--foreground);
										padding: 2rem;
									}
									.container {
										max-width: 400px;
										text-align: center;
									}
									.icon-wrapper {
										width: 4rem;
										height: 4rem;
										border-radius: 50%;
										background-color: var(--accent-bg);
										display: flex;
										align-items: center;
										justify-content: center;
										margin: 0 auto 1.5rem;
									}
									.icon-wrapper svg {
										width: 2rem;
										height: 2rem;
										color: var(--foreground); opacity: 0.7;
									}
									h1 {
										font-size: 1.5rem;
										font-weight: 600;
										margin-bottom: 0.75rem;
									}
									p {
										color: var(--muted);
										line-height: 1.5;
									}
								</style>
							</head>
							<body>
								<div class="container">
									<div class="icon-wrapper">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M20 6 9 17l-5-5"/>
										</svg>
									</div>
									<h1>CLI Connected</h1>
									<p>You can close this window.</p>
								</div>
							</body>
						</html>
					`), !h) h = !0, i.close(), t({
              source: "callback",
              accessToken: n
            });
          } else l.writeHead(400, {
            "Content-Type": "text/html"
          }), l.end(`
						<!DOCTYPE html>
						<html>
							<head>
								<title>Amp CLI Login Error</title>
								<style>
									:root {
										--background: #fafaf8;
										--foreground: #0b0d0b;
										--muted: #6b7280;
										--error: #dc2626;
										--error-bg: rgba(220, 38, 38, 0.1);
									}
									@media (prefers-color-scheme: dark) {
										:root {
											--background: #0b0d0b;
											--foreground: #f6fff5;
											--muted: #9ca3af;
											--error: #f87171;
											--error-bg: rgba(248, 113, 113, 0.1);
										}
									}
									* { margin: 0; padding: 0; box-sizing: border-box; }
									body {
										font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
										min-height: 100vh;
										display: flex;
										align-items: center;
										justify-content: center;
										background-color: var(--background);
										color: var(--foreground);
										padding: 2rem;
									}
									.container {
										max-width: 400px;
										text-align: center;
									}
									.icon-wrapper {
										width: 4rem;
										height: 4rem;
										border-radius: 50%;
										background-color: var(--error-bg);
										display: flex;
										align-items: center;
										justify-content: center;
										margin: 0 auto 1.5rem;
									}
									.icon-wrapper svg {
										width: 2rem;
										height: 2rem;
										color: var(--error);
									}
									h1 {
										font-size: 1.5rem;
										font-weight: 600;
										margin-bottom: 0.75rem;
									}
									p {
										color: var(--muted);
										line-height: 1.5;
									}
								</style>
							</head>
							<body>
								<div class="container">
									<div class="icon-wrapper">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<circle cx="12" cy="12" r="10"/>
											<line x1="15" y1="9" x2="9" y2="15"/>
											<line x1="9" y1="9" x2="15" y2="15"/>
										</svg>
									</div>
									<h1>Connection Failed</h1>
									<p>There was an error processing your login. Please try again from your terminal.</p>
								</div>
							</body>
						</html>
					`);
        } else l.writeHead(404), l.end();
      }),
      c = () => {
        if (!h) i.close(), h = !0, r(R.reason);
      };
    if (R.aborted) {
      c();
      return;
    } else R.addEventListener("abort", c, {
      once: !0
    });
    i.listen(e, "127.0.0.1", () => {
      J.info("Listening for auth callback", {
        port: e
      });
    });
    let s = setTimeout(() => {
      i.close(), h = !0, r(Error("Login timed out"));
    }, a);
    i.on("error", A => {
      clearTimeout(s), h = !0, J.error("Callback server error", {
        error: A
      }), r(A);
    });
  });
}