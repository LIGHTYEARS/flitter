function Be0(T) {
  let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
  return we0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Ne0(T) {
  let R = new A0(T, Wk),
    a = De0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function hGT(T) {
  return q0(T) ? uw(T) : null;
}
function iGT(T, R) {
  if (z0(T, R !== null), R !== null) yw(T, R);
}
function uPT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    action: KR(T),
    args: hGT(T)
  };
}
function Ue0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), iGT(T, R.args);
}
function He0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [uPT(T)];
  for (let e = 1; e < R; e++) a[e] = uPT(T);
  return a;
}
function We0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Ue0(T, R[a]);
}
function qe0(T) {
  return {
    input: hGT(T),
    hasInitialized: q0(T),
    state: uw(T),
    scheduledEvents: He0(T)
  };
}
function ze0(T, R) {
  iGT(T, R.input), z0(T, R.hasInitialized), yw(T, R.state), We0(T, R.scheduledEvents);
}
function Fe0(T) {
  let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
  return ze0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Ge0(T) {
  let R = new A0(T, Wk),
    a = qe0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function cGT(T, R) {
  if (!T) throw Error(R ?? "Assertion failed");
}
function Ke0(T) {
  return VU(T, 4);
}
function Ve0(T, R) {
  nGT(R.byteLength === 4), XU(T, R);
}
function Xe0(T) {
  return VU(T, 4);
}
function Ye0(T, R) {
  nGT(R.byteLength === 4), XU(T, R);
}
function sS(T) {
  return E0(T);
}
function oS(T, R) {
  C0(T, R);
}
function yPT(T) {
  return {
    eventName: KR(T)
  };
}
function Qe0(T, R) {
  YR(T, R.eventName);
}
function Ze0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [yPT(T)];
  for (let e = 1; e < R; e++) a[e] = yPT(T);
  return a;
}
function Je0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) Qe0(T, R[a]);
}
function Tt0(T) {
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