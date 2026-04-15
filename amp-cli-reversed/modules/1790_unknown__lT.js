async function _lT(T) {
  let {
      transport: R,
      oauthProvider: a,
      oldClient: e,
      baseUrl: t,
      requestInit: r,
      transportType: h,
      serverName: i
    } = T,
    c = a;
  try {
    J.debug("Waiting for OAuth authorization code");
    let s = await c.getAuthorizationCode();
    J.debug("Got authorization code, calling finishAuth", {
      codeLength: s.length
    });
    try {
      await R.finishAuth(s), J.debug("finishAuth completed - tokens exchanged, provider now has tokens");
    } catch (o) {
      throw await c.cleanupOnFailure(), o;
    }
    await c.releaseLockOnSuccess();
    try {
      await e.close();
    } catch (o) {
      J.debug("Failed to close previous client", {
        error: o
      });
    }
    let A = new wj(Yg.clientInfo, {
        capabilities: Yg.capabilities
      }),
      l = h === "HTTP" ? new T7(t, {
        requestInit: r,
        authProvider: a
      }) : new JD(t, {
        requestInit: r,
        authProvider: a
      });
    return J.debug("Connecting with authenticated transport"), await A.connect(l, {
      timeout: blT
    }), J.debug(`${h} OAuth flow succeeded - client connected`), {
      client: A,
      transportInfo: {
        type: h === "HTTP" ? "StreamableHTTPClientTransport" : "SSEClientTransport",
        url: R7(t)
      }
    };
  } catch (s) {
    if (s instanceof Z0T) {
      if (J.info("Another Amp instance is handling OAuth, waiting for tokens", {
        serverName: i,
        holderPid: s.holderPid
      }), await c.waitForTokensFromOtherInstance()) {
        try {
          await e.close();
        } catch (o) {
          J.debug("Failed to close previous client", {
            error: o
          });
        }
        let A = new wj(Yg.clientInfo, {
            capabilities: Yg.capabilities
          }),
          l = h === "HTTP" ? new T7(t, {
            requestInit: r,
            authProvider: a
          }) : new JD(t, {
            requestInit: r,
            authProvider: a
          });
        return await A.connect(l, {
          timeout: blT
        }), J.debug(`${h} connected using tokens from another instance`), {
          client: A,
          transportInfo: {
            type: h === "HTTP" ? "StreamableHTTPClientTransport" : "SSEClientTransport",
            url: R7(t)
          }
        };
      }
      throw new vG("Timed out waiting for OAuth tokens from another Amp instance. Please try again.", s);
    }
    if (J.error(`${h} OAuth flow failed`, {
      serverName: i,
      baseUrl: t.toString(),
      error: s.message,
      errorName: s.name
    }), s.name === "OAuthTimeoutError") throw s;
    throw new vG(`OAuth authentication failed: ${s.message}

If this server doesn't support OAuth, add authentication headers to your config.
If it does support OAuth, ensure you've registered with:
  amp mcp oauth login <server-name> --server-url <url> --client-id <id> --auth-url <url> --token-url <url>`, s);
  }
}