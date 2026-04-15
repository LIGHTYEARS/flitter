function Xp0(T, R) {
  let a = Vp0(R);
  return ul0(P$(T) ?? [], a, {
    dedupeAdded: !0,
    getQueuedMessageId: e => e.id
  });
}
async function Yp0(T, R) {
  if (R.usesThreadActors) {
    let a = lH(T.ampURL),
      e = nH({
        endpoint: a
      });
    return {
      baseURL: a,
      threadId: R.threadId,
      wsToken: R.wsToken,
      wsTokenProvider: async () => uA(R.threadId, T.configService, T.apiKey, {
        repositoryURL: T.repositoryURL
      }),
      webSocketProvider: async () => {
        let t = await uA(R.threadId, T.configService, T.apiKey, {
          repositoryURL: T.repositoryURL
        });
        return await e.threadActor.getOrCreate([t.threadId], {
          params: {
            wsToken: t.wsToken
          },
          createWithInput: {
            threadId: t.threadId,
            threadVersion: t.threadVersion,
            ownerUserId: t.ownerUserId,
            agentMode: t.agentMode
          }
        }).webSocket("/");
      },
      WebSocketClass: WebSocket,
      maxReconnectAttempts: Number.POSITIVE_INFINITY,
      pingIntervalMs: 5000,
      useThreadActors: !0
    };
  }
  return {
    baseURL: T.workerUrl ?? Pi(T.ampURL),
    threadId: R.threadId,
    wsToken: R.wsToken,
    wsTokenProvider: async () => uA(R.threadId, T.configService, T.apiKey, {
      repositoryURL: T.repositoryURL
    }),
    WebSocketClass: WebSocket,
    maxReconnectAttempts: Number.POSITIVE_INFINITY,
    pingIntervalMs: 5000
  };
}