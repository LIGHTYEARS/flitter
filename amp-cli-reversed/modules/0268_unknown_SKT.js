function Ln0(T) {
  let R = Q1(T);
  return JSON.stringify(R);
}
function SKT(T, R) {
  let a = On0(T, R);
  return Ln0({
    failureType: a.failureType,
    source: "dtw-transport",
    direction: "server->client",
    stage: "decode-server-message",
    summary: a.summary,
    messageType: a.messageType,
    typePreview: a.typePreview,
    payloadPreview: a.payloadPreview,
    issues: a.issues
  });
}