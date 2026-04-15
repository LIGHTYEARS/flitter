function NC(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_controlledReadableStream") && T instanceof gl;
}
function rv(T) {
  if (!function (R) {
    let a = R._controlledReadableStream;
    if (!c$(R)) return !1;
    if (!R._started) return !1;
    if (Ok(a) && U7(a) > 0) return !0;
    if (mHT(R) > 0) return !0;
    return !1;
  }(T)) return;
  if (T._pulling) return void (T._pullAgain = !0);
  T._pulling = !0, ot(T._pullAlgorithm(), () => (T._pulling = !1, T._pullAgain && (T._pullAgain = !1, rv(T)), null), R => (hv(T, R), null));
}