function TM(T) {
  T._pullAlgorithm = void 0, T._cancelAlgorithm = void 0, T._strategySizeAlgorithm = void 0;
}
function hv(T, R) {
  let a = T._controlledReadableStream;
  a._state === "readable" && (lA(T), TM(T), yHT(a, R));
}
function mHT(T) {
  let R = T._controlledReadableStream._state;
  return R === "errored" ? null : R === "closed" ? 0 : T._strategyHWM - T._queueTotalSize;
}
function c$(T) {
  return !T._closeRequested && T._controlledReadableStream._state === "readable";
}
function QLR(T, R, a, e) {
  let t = Object.create(gl.prototype),
    r,
    h,
    i;
  r = R.start !== void 0 ? () => R.start(t) : () => {}, h = R.pull !== void 0 ? () => R.pull(t) : () => E8(void 0), i = R.cancel !== void 0 ? c => R.cancel(c) : () => E8(void 0), function (c, s, A, l, o, n, p) {
    s._controlledReadableStream = c, s._queue = void 0, s._queueTotalSize = void 0, lA(s), s._started = !1, s._closeRequested = !1, s._pullAgain = !1, s._pulling = !1, s._strategySizeAlgorithm = p, s._strategyHWM = n, s._pullAlgorithm = l, s._cancelAlgorithm = o, c._readableStreamController = s, ot(E8(A()), () => (s._started = !0, rv(s), null), _ => (hv(s, _), null));
  }(T, t, r, h, i, a, e);
}