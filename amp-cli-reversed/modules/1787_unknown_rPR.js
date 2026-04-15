function tPR(T) {
  U9T = T;
}
function oDT(T) {
  U9T.recordEvent(T);
}
function lDT(T) {
  return T === "StdioClientTransport";
}
function rPR(T) {
  let R = lDT(T.transport) ? "localConnected" : "remoteConnected";
  oDT({
    feature: "mcp.connection",
    action: R,
    metadata: {
      transport: T.transport,
      url: T.url,
      serverName: T.serverName,
      threadId: T.threadId
    }
  });
}