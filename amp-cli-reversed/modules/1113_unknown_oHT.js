function Os(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_writableStreamController") && T instanceof wl;
}
function ZL(T) {
  return T._writer !== void 0;
}
function oHT(T, R) {
  var a;
  if (T._state === "closed" || T._state === "errored") return E8(void 0);
  T._writableStreamController._abortReason = R, (a = T._writableStreamController._abortController) === null || a === void 0 || a.abort(R);
  let e = T._state;
  if (e === "closed" || e === "errored") return E8(void 0);
  if (T._pendingAbortRequest !== void 0) return T._pendingAbortRequest._promise;
  let t = !1;
  e === "erroring" && (t = !0, R = void 0);
  let r = zt((h, i) => {
    T._pendingAbortRequest = {
      _promise: void 0,
      _resolve: h,
      _reject: i,
      _reason: R,
      _wasAlreadyErroring: t
    };
  });
  return T._pendingAbortRequest._promise = r, t || D3T(T, R), r;
}