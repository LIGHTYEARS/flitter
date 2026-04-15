function pe0(T, R) {
  switch (R.tag) {
    case "GenericPersistedScheduleEvent":
      {
        dR(T, 0), le0(T, R.val);
        break;
      }
  }
}
function _PT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    kind: Ae0(T)
  };
}
function _e0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), pe0(T, R.kind);
}
function bPT(T) {
  return {
    requestId: E0(T),
    lastSeenTimestamp: jA(T),
    msgIndex: jA(T)
  };
}
function be0(T, R) {
  C0(T, R.requestId), SA(T, R.lastSeenTimestamp), SA(T, R.msgIndex);
}
function me0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [pPT(T)];
  for (let e = 1; e < R; e++) a[e] = pPT(T);
  return a;
}
function ue0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) oe0(T, R[a]);
}
function ye0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [_PT(T)];
  for (let e = 1; e < R; e++) a[e] = _PT(T);
  return a;
}
function Pe0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) _e0(T, R[a]);
}
function ke0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [bPT(T)];
  for (let e = 1; e < R; e++) a[e] = bPT(T);
  return a;
}
function xe0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) be0(T, R[a]);
}
function fe0(T) {
  return {
    input: keT(T),
    hasInitialized: q0(T),
    state: E0(T),
    connections: me0(T),
    scheduledEvents: ye0(T),
    hibernatableWebSockets: ke0(T)
  };
}
function Ie0(T, R) {
  xeT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), ue0(T, R.connections), Pe0(T, R.scheduledEvents), xe0(T, R.hibernatableWebSockets);
}
function ge0(T) {
  let R = new A0(new Uint8Array(u1.initialBufferLength), u1);
  return Ie0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function $e0(T) {
  let R = new A0(T, u1),
    a = fe0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ve0(T) {
  return VU(T, 4);
}
function je0(T, R) {
  cGT(R.byteLength === 4), XU(T, R);
}
function Se0(T) {
  return VU(T, 4);
}
function Oe0(T, R) {
  cGT(R.byteLength === 4), XU(T, R);
}
function uw(T) {
  return E0(T);
}
function yw(T, R) {
  C0(T, R);
}
function mPT(T) {
  return {
    eventName: KR(T)
  };
}
function de0(T, R) {
  YR(T, R.eventName);
}
function Ee0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [mPT(T)];
  for (let e = 1; e < R; e++) a[e] = mPT(T);
  return a;
}
function Ce0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) de0(T, R[a]);
}
function Le0(T) {
  let R = M8(T),
    a = new Map();
  for (let e = 0; e < R; e++) {
    let t = T.offset,
      r = KR(T);
    if (a.has(r)) throw T.offset = t, new I0(t, "duplicated key");
    a.set(r, KR(T));
  }
  return a;
}