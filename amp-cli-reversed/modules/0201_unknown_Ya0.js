function oPT(T) {
  return {
    eventName: KR(T)
  };
}
function za0(T, R) {
  YR(T, R.eventName);
}
function Fa0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [oPT(T)];
  for (let e = 1; e < R; e++) a[e] = oPT(T);
  return a;
}
function Ga0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) za0(T, R[a]);
}
function nPT(T) {
  return {
    id: KR(T),
    token: KR(T),
    parameters: E0(T),
    state: E0(T),
    subscriptions: Fa0(T),
    lastSeen: Ws(T)
  };
}
function Ka0(T, R) {
  YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), Ga0(T, R.subscriptions), qs(T, R.lastSeen);
}
function tGT(T) {
  return q0(T) ? E0(T) : null;
}
function rGT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function Va0(T) {
  return {
    action: KR(T),
    args: tGT(T)
  };
}
function Xa0(T, R) {
  YR(T, R.action), rGT(T, R.args);
}
function Ya0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "GenericPersistedScheduleEvent",
        val: Va0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}