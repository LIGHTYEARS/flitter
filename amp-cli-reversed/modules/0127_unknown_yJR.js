function pJR(T) {
  return {
    body: lJR(T)
  };
}
function _JR(T, R) {
  AJR(T, R.body);
}
function bJR(T) {
  let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
  return _JR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function mJR(T) {
  let R = new A0(T, Nk),
    a = pJR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function GFT(T) {
  return E0(T);
}
function KFT(T, R) {
  C0(T, R);
}
function IyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function uJR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function VFT(T) {
  return E0(T);
}
function XFT(T, R) {
  C0(T, R);
}
function TeT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [IyT(T)];
  for (let e = 1; e < R; e++) a[e] = IyT(T);
  return a;
}
function ReT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) uJR(T, R[a]);
}
function YFT(T) {
  return q0(T) ? GFT(T) : null;
}
function QFT(T, R) {
  if (z0(T, R !== null), R !== null) KFT(T, R);
}
function ZFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function JFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function T2T(T) {
  return q0(T) ? VFT(T) : null;
}
function R2T(T, R) {
  if (z0(T, R !== null), R !== null) XFT(T, R);
}
function yJR(T) {
  return {
    connections: TeT(T),
    state: YFT(T),
    isStateEnabled: q0(T),
    rpcs: ZFT(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: T2T(T),
    isWorkflowEnabled: q0(T)
  };
}