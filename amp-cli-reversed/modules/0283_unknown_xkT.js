async function xkT(T) {
  let R = T.workerUrl ?? Pi(T.ampURL),
    a = new uH({
      baseURL: R,
      apiKey: T.apiKey,
      threadId: T.threadId,
      WebSocketClass: WebSocket,
      maxReconnectAttempts: 1,
      pingIntervalMs: 5000
    }),
    e = T.timeoutMs ?? Pl0;
  if (!(await a.ensureConnected({
    maxAttempts: 1,
    waitForConnectedTimeoutMs: e
  }))) throw Error(`Timed out waiting for DTW connection after ${e}ms`);
  a.resumeFromVersion(0);
  let t = a.sendUserMessage([{
      type: "text",
      text: T.message
    }], T.agentMode),
    r = kl0(a, t, e);
  try {
    return {
      messageId: (await r.promise).message.messageId
    };
  } finally {
    r.dispose(), await a.disconnectAndWait(), a.dispose();
  }
}