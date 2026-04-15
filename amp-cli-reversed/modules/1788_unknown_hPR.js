function hPR(T) {
  let R = lDT(T.transport) ? "localToolCalled" : "remoteToolCalled";
  oDT({
    feature: "mcp.toolUsage",
    action: R,
    metadata: {
      transport: T.transport,
      url: T.url,
      toolName: T.toolName,
      serverName: T.serverName,
      threadId: T.threadId
    }
  });
}