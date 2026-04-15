function dy(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_controlledReadableByteStream") && T instanceof Il;
}
function W5(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_associatedReadableByteStreamController") && T instanceof B_;
}
function Hb(T) {
  if (!function (R) {
    let a = R._controlledReadableByteStream;
    if (a._state !== "readable") return !1;
    if (R._closeRequested) return !1;
    if (!R._started) return !1;
    if (QUT(a) && U7(a) > 0) return !0;
    if (M3T(a) && cHT(a) > 0) return !0;
    if (iHT(R) > 0) return !0;
    return !1;
  }(T)) return;
  if (T._pulling) return void (T._pullAgain = !0);
  T._pulling = !0, ot(T._pullAlgorithm(), () => (T._pulling = !1, T._pullAgain && (T._pullAgain = !1, Hb(T)), null), R => (Sk(T, R), null));
}