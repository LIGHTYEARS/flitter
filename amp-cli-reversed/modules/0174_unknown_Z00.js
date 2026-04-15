function VyT(T) {
  return {
    timeOffsetNs: Ws(T),
    body: L00(T)
  };
}
function D00(T, R) {
  qs(T, R.timeOffsetNs), M00(T, R.body);
}
function L2T(T) {
  return {
    prefix: ge(T),
    bucketStartSec: Ws(T),
    chunkId: ge(T),
    recordIndex: ge(T)
  };
}
function M2T(T, R) {
  $e(T, R.prefix), qs(T, R.bucketStartSec), $e(T, R.chunkId), $e(T, R.recordIndex);
}
function w00(T) {
  return q0(T) ? L2T(T) : null;
}
function B00(T, R) {
  if (z0(T, R !== null), R !== null) M2T(T, R);
}
function XyT(T) {
  return {
    spanId: lp(T),
    startKey: L2T(T),
    latestSnapshotKey: w00(T)
  };
}
function N00(T, R) {
  Ap(T, R.spanId), M2T(T, R.startKey), B00(T, R.latestSnapshotKey);
}
function U00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function H00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function W00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [VyT(T)];
  for (let e = 1; e < R; e++) a[e] = VyT(T);
  return a;
}
function q00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) D00(T, R[a]);
}
function z00(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [XyT(T)];
  for (let e = 1; e < R; e++) a[e] = XyT(T);
  return a;
}
function F00(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) N00(T, R[a]);
}
function s1(T) {
  return {
    baseUnixNs: Ws(T),
    strings: U00(T),
    records: W00(T),
    activeSpans: z00(T)
  };
}
function D2T(T, R) {
  qs(T, R.baseUnixNs), H00(T, R.strings), q00(T, R.records), F00(T, R.activeSpans);
}
function YyT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [s1(T)];
  for (let e = 1; e < R; e++) a[e] = s1(T);
  return a;
}
function QyT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) D2T(T, R[a]);
}
function G00(T) {
  return {
    startTimeMs: Ws(T),
    endTimeMs: Ws(T),
    limit: ge(T),
    clamped: q0(T),
    baseChunks: YyT(T),
    chunks: YyT(T)
  };
}
function K00(T, R) {
  qs(T, R.startTimeMs), qs(T, R.endTimeMs), $e(T, R.limit), z0(T, R.clamped), QyT(T, R.baseChunks), QyT(T, R.chunks);
}
function V00(T) {
  let R = new A0(new Uint8Array(c1.initialBufferLength), c1);
  return K00(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function X00(T) {
  let R = new A0(T, c1),
    a = G00(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Y00(T) {
  let R = new A0(new Uint8Array(o1.initialBufferLength), o1);
  return D2T(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Q00(T) {
  let R = new A0(T, o1);
  return s1(R);
}
function n1(T) {
  return T instanceof Date || T instanceof Set || T instanceof Map || T instanceof WeakSet || T instanceof WeakMap || ArrayBuffer.isView(T);
}
function Z00(T) {
  return T === null || typeof T !== "object" && typeof T !== "function" || T instanceof RegExp || T instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && T instanceof SharedArrayBuffer;
}