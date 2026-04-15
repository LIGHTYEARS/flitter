function Qa0(T, R) {
  switch (R.tag) {
    case "GenericPersistedScheduleEvent":
      {
        dR(T, 0), Xa0(T, R.val);
        break;
      }
  }
}
function lPT(T) {
  return {
    eventId: KR(T),
    timestamp: Ws(T),
    kind: Ya0(T)
  };
}
function Za0(T, R) {
  YR(T, R.eventId), qs(T, R.timestamp), Qa0(T, R.kind);
}
function Ja0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [nPT(T)];
  for (let e = 1; e < R; e++) a[e] = nPT(T);
  return a;
}
function Te0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Ka0(T, R[a]);
}
function Re0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [lPT(T)];
  for (let e = 1; e < R; e++) a[e] = lPT(T);
  return a;
}
function ae0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Za0(T, R[a]);
}
function ee0(T) {
  return {
    input: tGT(T),
    hasInitialized: q0(T),
    state: E0(T),
    connections: Ja0(T),
    scheduledEvents: Re0(T)
  };
}
function te0(T, R) {
  rGT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), Te0(T, R.connections), ae0(T, R.scheduledEvents);
}
function re0(T) {
  let R = new A0(new Uint8Array(m1.initialBufferLength), m1);
  return te0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function he0(T) {
  let R = new A0(T, m1),
    a = ee0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function APT(T) {
  return {
    eventName: KR(T)
  };
}
function ie0(T, R) {
  YR(T, R.eventName);
}
function ce0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [APT(T)];
  for (let e = 1; e < R; e++) a[e] = APT(T);
  return a;
}
function se0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) ie0(T, R[a]);
}
function keT(T) {
  return q0(T) ? E0(T) : null;
}
function xeT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function pPT(T) {
  return {
    id: KR(T),
    token: KR(T),
    parameters: E0(T),
    state: E0(T),
    subscriptions: ce0(T),
    lastSeen: jA(T),
    hibernatableRequestId: keT(T)
  };
}
function oe0(T, R) {
  YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), se0(T, R.subscriptions), SA(T, R.lastSeen), xeT(T, R.hibernatableRequestId);
}
function ne0(T) {
  return {
    action: KR(T),
    args: keT(T)
  };
}
function le0(T, R) {
  YR(T, R.action), xeT(T, R.args);
}
function Ae0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "GenericPersistedScheduleEvent",
        val: ne0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}