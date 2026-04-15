function KbT(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_transformStreamController") && T instanceof K7;
}
function V7(T, R) {
  Q7(T, R), jU(T, R);
}
function jU(T, R) {
  kHT(T._transformStreamController), function (a, e) {
    a._writableController.error(e), a._writableState === "writable" && gHT(a, e);
  }(T, R), T._backpressure && X7(T, !1);
}
function X7(T, R) {
  T._backpressureChangePromise !== void 0 && T._backpressureChangePromise_resolve(), T._backpressureChangePromise = zt(a => {
    T._backpressureChangePromise_resolve = a;
  }), T._backpressure = R;
}