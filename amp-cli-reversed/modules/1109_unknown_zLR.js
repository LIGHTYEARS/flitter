function BP(T) {
  return T._pendingPullIntos.shift();
}
function H7(T) {
  T._pullAlgorithm = void 0, T._cancelAlgorithm = void 0;
}
function Sk(T, R) {
  let a = T._controlledReadableByteStream;
  a._state === "readable" && (THT(T), lA(T), H7(T), yHT(a, R));
}
function DbT(T, R) {
  let a = T._queue.shift();
  T._queueTotalSize -= a.byteLength, hHT(T);
  let e = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  R._chunkSteps(e);
}
function iHT(T) {
  let R = T._controlledReadableByteStream._state;
  return R === "errored" ? null : R === "closed" ? 0 : T._strategyHWM - T._queueTotalSize;
}
function zLR(T, R, a) {
  let e = Object.create(Il.prototype),
    t,
    r,
    h;
  t = R.start !== void 0 ? () => R.start(e) : () => {}, r = R.pull !== void 0 ? () => R.pull(e) : () => E8(void 0), h = R.cancel !== void 0 ? c => R.cancel(c) : () => E8(void 0);
  let i = R.autoAllocateChunkSize;
  if (i === 0) throw TypeError("autoAllocateChunkSize must be greater than 0");
  (function (c, s, A, l, o, n, p) {
    s._controlledReadableByteStream = c, s._pullAgain = !1, s._pulling = !1, s._byobRequest = null, s._queue = s._queueTotalSize = void 0, lA(s), s._closeRequested = !1, s._started = !1, s._strategyHWM = n, s._pullAlgorithm = l, s._cancelAlgorithm = o, s._autoAllocateChunkSize = p, s._pendingPullIntos = new Dh(), c._readableStreamController = s, ot(E8(A()), () => (s._started = !0, Hb(s), null), _ => (Sk(s, _), null));
  })(T, e, t, r, h, a, i);
}