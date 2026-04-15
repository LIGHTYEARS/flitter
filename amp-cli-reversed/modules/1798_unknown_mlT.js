function uPR(T) {
  return XA({
    source: {
      type: "base64",
      data: T
    }
  });
}
function mlT(T, R, a = !1) {
  let e = T.message;
  if (T instanceof l9) switch (T.code) {
    case c9.RequestTimeout:
      return {
        code: "timeout",
        message: e
      };
    case c9.ConnectionClosed:
      return {
        code: "network",
        message: e || "Connection closed unexpectedly"
      };
    case c9.InvalidRequest:
    case c9.InvalidParams:
    case c9.ParseError:
    case c9.MethodNotFound:
    case c9.InternalError:
      return {
        code: "server-error",
        message: e
      };
  }
  if (e.includes("does not support dynamic client registration")) e = `OAuth connection failed: ${e}

Try registering OAuth credentials manually:
  amp mcp oauth login ${R || "<server-name>"} --server-url <url> --client-id <id>

Required: --server-url, --client-id
Optional: --auth-url, --token-url (auto-discovered if not provided), --client-secret, --scopes

If manual registration doesn't work, this server likely doesn't support OAuth.`;
  let t = "server-error";
  if (e.includes("timeout") || e.includes("Timeout")) t = "timeout";else if (e.includes("OAuth") || e.includes("authorization") || e.includes("Unauthorized") || e.includes("401")) t = "auth-failed";else if (e.includes("fetch failed") || e.includes("network") || e.includes("ECONNREFUSED") || e.includes("ECONNRESET") || e.includes("ETIMEDOUT") || e.includes("Not connected") || e.includes("Connection closed")) t = "network";else if (e.includes("spawn") || e.includes("ENOENT") || e.includes("command not found")) t = "spawn-failed";else if (e.includes("not allowed by MCP permissions")) t = "permission-denied";
  if (t === "auth-failed" && a && R && !e.includes("amp mcp oauth logout")) e = `${e}

If this is due to stale OAuth credentials, clear them and retry:
  amp mcp oauth logout ${R}`;
  return {
    code: t,
    message: e,
    stderr: T.stderr
  };
}