function WP() {
  try {
    J.debug("cleanupTerminal() called"), xl0.disable(), ul.write("\x1B[?25h");
  } catch (T) {}
}
function $v(T) {
  if (T instanceof GR) return {
    message: T.userMessage,
    suggestion: T.suggestion
  };
  if (T instanceof s1R) return {
    message: T.message
  };
  if (T instanceof Error) {
    let R = (T.message ?? "").toLowerCase();
    if (R.includes("401") || R.includes("unauthorized")) return {
      message: V3.invalidAPIKey
    };
    if (R.includes("403") || R.includes("forbidden")) return {
      message: V3.authExpired
    };
    if (R.includes("timeout") || R.includes("etimedout")) return {
      message: V3.networkTimeout
    };
    if (R.includes("websocket connection failed") || R.includes("websocket closed during connect") || R.includes("expected 101 status code") || R.includes("failed to get wstoken") || R.includes("websocket is not connected")) return {
      message: V3.webSocketConnectionFailed
    };
    if (R.includes("enotfound") || R.includes("econnrefused") || R.includes("unable to connect")) return {
      message: V3.networkOffline
    };
    if (R.includes("thread") && R.includes("not found")) return {
      message: "Thread not found or you don't have access."
    };
    if (R.includes("fetch failed") || R.includes("failed to fetch")) return {
      message: V3.networkOffline
    };
  }
  return {
    message: V3.internalBug
  };
}