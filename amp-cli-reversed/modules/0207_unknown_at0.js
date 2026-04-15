function Rt0(T, R) {
  D8(T, R.size);
  for (let a of R) YR(T, a[0]), YR(T, a[1]);
}
function at0(T) {
  return {
    id: KR(T),
    parameters: sS(T),
    state: sS(T),
    subscriptions: Ze0(T),
    gatewayId: Ke0(T),
    requestId: Xe0(T),
    serverMessageIndex: pw(T),
    clientMessageIndex: pw(T),
    requestPath: KR(T),
    requestHeaders: Tt0(T)
  };
}