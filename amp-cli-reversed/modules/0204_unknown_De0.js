function Me0(T, R) {
  D8(T, R.size);
  for (let a of R) YR(T, a[0]), YR(T, a[1]);
}
function De0(T) {
  return {
    id: KR(T),
    parameters: uw(T),
    state: uw(T),
    subscriptions: Ee0(T),
    gatewayId: ve0(T),
    requestId: Se0(T),
    serverMessageIndex: pw(T),
    clientMessageIndex: pw(T),
    requestPath: KR(T),
    requestHeaders: Le0(T)
  };
}