function IT0(T) {
  return {
    body: xT0(T)
  };
}
function gT0(T, R) {
  fT0(T, R.body);
}
function $T0(T) {
  let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
  return gT0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function vT0(T) {
  let R = new A0(T, Uk),
    a = IT0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function a2T(T) {
  return E0(T);
}
function e2T(T, R) {
  C0(T, R);
}
function $yT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function jT0(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function t2T(T) {
  return E0(T);
}
function r2T(T, R) {
  C0(T, R);
}
function aeT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [$yT(T)];
  for (let e = 1; e < R; e++) a[e] = $yT(T);
  return a;
}
function eeT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) jT0(T, R[a]);
}
function h2T(T) {
  return q0(T) ? a2T(T) : null;
}
function i2T(T, R) {
  if (z0(T, R !== null), R !== null) e2T(T, R);
}
function c2T(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function s2T(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function o2T(T) {
  return q0(T) ? t2T(T) : null;
}
function n2T(T, R) {
  if (z0(T, R !== null), R !== null) r2T(T, R);
}
function ST0(T) {
  return {
    connections: aeT(T),
    state: h2T(T),
    isStateEnabled: q0(T),
    rpcs: c2T(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: o2T(T),
    isWorkflowEnabled: q0(T)
  };
}