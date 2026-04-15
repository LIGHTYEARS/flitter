function tt0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return et0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function rt0(T) {
  let R = new A0(T, vi),
    a = at0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function sGT(T) {
  return q0(T) ? sS(T) : null;
}
function oGT(T, R) {
  if (z0(T, R !== null), R !== null) oS(T, R);
}
function PPT(T) {
  return {
    eventId: KR(T),
    timestamp: jA(T),
    action: KR(T),
    args: sGT(T)
  };
}
function ht0(T, R) {
  YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), oGT(T, R.args);
}
function it0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [PPT(T)];
  for (let e = 1; e < R; e++) a[e] = PPT(T);
  return a;
}
function ct0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) ht0(T, R[a]);
}
function st0(T) {
  return {
    input: sGT(T),
    hasInitialized: q0(T),
    state: sS(T),
    scheduledEvents: it0(T)
  };
}
function ot0(T, R) {
  oGT(T, R.input), z0(T, R.hasInitialized), oS(T, R.state), ct0(T, R.scheduledEvents);
}
function nt0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return ot0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function lt0(T) {
  let R = new A0(T, vi),
    a = st0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function At0(T) {
  return {
    nextId: Ws(T),
    size: ge(T)
  };
}
function pt0(T, R) {
  qs(T, R.nextId), $e(T, R.size);
}
function _t0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return pt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function bt0(T) {
  let R = new A0(T, vi),
    a = At0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function mt0(T) {
  return q0(T) ? ge(T) : null;
}
function ut0(T, R) {
  if (z0(T, R !== null), R !== null) $e(T, R);
}
function kPT(T) {
  return q0(T) ? jA(T) : null;
}
function xPT(T, R) {
  if (z0(T, R !== null), R !== null) SA(T, R);
}
function yt0(T) {
  return q0(T) ? q0(T) : null;
}
function Pt0(T, R) {
  if (z0(T, R !== null), R !== null) z0(T, R);
}
function kt0(T) {
  return {
    name: KR(T),
    body: sS(T),
    createdAt: jA(T),
    failureCount: mt0(T),
    availableAt: kPT(T),
    inFlight: yt0(T),
    inFlightAt: kPT(T)
  };
}
function xt0(T, R) {
  YR(T, R.name), oS(T, R.body), SA(T, R.createdAt), ut0(T, R.failureCount), xPT(T, R.availableAt), Pt0(T, R.inFlight), xPT(T, R.inFlightAt);
}
function ft0(T) {
  let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
  return xt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function It0(T) {
  let R = new A0(T, vi),
    a = kt0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function nGT(T, R) {
  if (!T) throw Error(R ?? "Assertion failed");
}
function P1(T) {
  if (T.length === 0) return lGT;
  return T.map(R => {
    if (R === "") return "\\0";
    let a = R.replace(/\\/g, "\\\\");
    return a = a.replace(/\//g, `\\${y1}`), a;
  }).join(y1);
}