async function mC0() {
  await ax0(AC0);
}
function uC0(T) {
  let R = new eS("oauth").description("Manage OAuth authentication for MCP servers");
  return R.command("login").description("Register OAuth client credentials for an MCP server").argument("<server-name>", "Name of the MCP server to authenticate with").requiredOption("--server-url <url>", "MCP server URL").requiredOption("--client-id <id>", "OAuth client ID").option("--client-secret <secret>", "OAuth client secret; only necessary for clients that don't support PKCE").option("--scopes <scopes>", "OAuth scopes (comma-separated)").option("--auth-url <url>", "OAuth authorization URL (discovered if not provided)").option("--token-url <url>", "OAuth token URL (discovered if not provided)").action(async (a, e, t) => {
    let r = t.optsWithGlobals(),
      {
        secretStorage: h
      } = await T(r),
      i = new lv(h);
    try {
      let {
        authUrl: c,
        tokenUrl: s
      } = e;
      if (!c || !s) {
        process.stdout.write(`
Discovering OAuth endpoints for ${e.serverUrl}...
`);
        let l = new URL("/.well-known/oauth-authorization-server", e.serverUrl),
          o = await fetch(l.toString());
        if (!o.ok) throw Error(`OAuth discovery failed (HTTP ${o.status}). Provide --auth-url and --token-url manually.`);
        let n = await o.json();
        if (c = c || n.authorization_endpoint, s = s || n.token_endpoint, !c || !s) throw Error("OAuth endpoints not found in discovery metadata. Provide --auth-url and --token-url manually.");
        process.stdout.write(` Discovered OAuth endpoints
`);
      }
      let A = e.scopes?.split(",").map(l => l.trim()) || [];
      await i.saveClientInfo(a, {
        clientId: e.clientId,
        clientSecret: e.clientSecret,
        redirectUrl: "http://localhost:8976/oauth/callback",
        authUrl: c,
        tokenUrl: s,
        scopes: A,
        serverUrl: e.serverUrl
      }), process.stdout.write(`
 OAuth client registered for "${a}"
  Client ID: ${e.clientId}
  Auth URL: ${c}
  Token URL: ${s}
  Scopes: ${A.join(", ") || "none"}

Your browser will automatically open for authorization when you start up the Amp coding agent.

`), J.info("OAuth client registered", {
        serverName: a,
        authUrl: c,
        tokenUrl: s
      }), process.exit(0);
    } catch (c) {
      J.error("Failed to register OAuth client", {
        error: c,
        serverName: a
      }), process.stderr.write(`
 Error: ${c.message}

`), process.exit(1);
    }
  }), R.command("logout").description("Remove OAuth credentials for an MCP server").argument("<server-name>", "Name of the MCP server").action(async (a, e, t) => {
    let r = t.optsWithGlobals(),
      {
        secretStorage: h
      } = await T(r),
      i = new lv(h);
    try {
      await i.clearAll(a), J.info("OAuth credentials removed", {
        serverName: a
      }), process.stdout.write(`
 Removed OAuth credentials for ${a}

`), process.exit(0);
    } catch (c) {
      J.error("Failed to remove OAuth credentials", {
        error: c,
        serverName: a
      }), process.stderr.write(`
 Failed to remove credentials: ${c.message}

`), process.exit(1);
    }
  }), R.command("status").description("Show OAuth status for an MCP server").argument("<server-name>", "Name of the MCP server").action(async (a, e, t) => {
    let r = t.optsWithGlobals(),
      {
        secretStorage: h,
        settings: i
      } = await T(r),
      c = new lv(h);
    try {
      let s = (await i.get("mcpServers")) ?? {};
      if (!s[a]) {
        process.stdout.write(`
Server "${a}" is not in your current MCP configuration.

`);
        return;
      }
      let A = s[a];
      if (!("url" in A && !("headers" in A) && !("command" in A))) {
        process.stdout.write(`
Server "${a}" does not use OAuth authentication.
` + ("headers" in A ? `This server uses header-based authentication.

` : "command" in A ? `This server is command-based and doesn't require OAuth.

` : `This server is configured with explicit authentication.

`));
        return;
      }
      let l = await c.getTokens(a),
        o = await c.getClientInfo(a);
      if (!l && !o) {
        process.stdout.write(`
No OAuth credentials found for ${a}

`);
        return;
      }
      if (process.stdout.write(`
OAuth status for ${a}:
`), o) process.stdout.write(`  Client ID: ${o.clientId}
`), process.stdout.write(`  Auth URL: ${o.authUrl || "(discovered dynamically)"}
`), process.stdout.write(`  Token URL: ${o.tokenUrl || "(discovered dynamically)"}
`);
      if (l) {
        if (process.stdout.write(`  Access Token: ${l.accessToken ? " Present" : " Missing"}
`), process.stdout.write(`  Refresh Token: ${l.refreshToken ? " Present" : " Missing"}
`), l.expiresAt) {
          let n = Math.floor((l.expiresAt - Date.now()) / 1000);
          if (n > 0) process.stdout.write(`  Expires in: ${Math.floor(n / 60)} minutes
`);else process.stdout.write(`  Status:  Expired
`);
        }
      }
      process.stdout.write(`
`), process.exit(0);
    } catch (s) {
      J.error("Failed to check OAuth status", {
        error: s,
        serverName: a
      }), process.stderr.write(`
 Failed to check status: ${s.message}

`), process.exit(1);
    }
  }), R;
}