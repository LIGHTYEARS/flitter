async function nPR(T, R, a, e, t) {
  let r = a ? {
      headers: a
    } : void 0,
    h = new T7(R, t ? {
      requestInit: r,
      authProvider: t
    } : r ? {
      requestInit: r
    } : void 0);
  try {
    await e.connect(h, {
      timeout: jG
    }), J.debug("Connected using StreamableHTTPClientTransport");
    let s = R7(R);
    return {
      client: e,
      transportInfo: {
        type: "StreamableHTTPClientTransport",
        url: s
      }
    };
  } catch (s) {
    if (plT(s) && t) {
      J.debug("OAuth authorization required, starting OAuth flow", {
        serverName: T,
        baseUrl: R.toString()
      });
      try {
        return await _lT({
          transport: h,
          oauthProvider: t,
          oldClient: e,
          baseUrl: R,
          requestInit: r,
          transportType: "HTTP",
          serverName: T
        });
      } catch (A) {
        if (A.name === "OAuthTimeoutError") throw A;
        J.debug("HTTP OAuth flow failed, will try SSE fallback", {
          serverName: T,
          error: A.message
        });
      }
    }
    J.debug("StreamableHTTPClientTransport failed, falling back to SSE", {
      serverName: T,
      baseUrl: R.toString(),
      error: s.message
    });
  }
  try {
    await e.close();
  } catch (s) {
    J.debug("Failed to close previous client", {
      error: s
    });
  }
  let i = new wj(Bj.clientInfo, {
      capabilities: Bj.capabilities
    }),
    c = new JD(R, t ? {
      requestInit: r,
      authProvider: t
    } : r ? {
      requestInit: r
    } : void 0);
  try {
    await i.connect(c, {
      timeout: jG
    }), J.debug("Connected using SSEClientTransport");
    let s = R7(R);
    return {
      client: i,
      transportInfo: {
        type: "SSEClientTransport",
        url: s
      }
    };
  } catch (s) {
    if (plT(s) && t) return J.debug("SSE OAuth authorization required, completing flow", {
      serverName: T,
      baseUrl: R.toString()
    }), await _lT({
      transport: c,
      oauthProvider: t,
      oldClient: i,
      baseUrl: R,
      requestInit: r,
      transportType: "SSE",
      serverName: T
    });
    throw s;
  }
}