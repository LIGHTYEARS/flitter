function eX(T, R) {
  T._state !== "writable" ? w3T(T) : D3T(T, R);
}
function D3T(T, R) {
  let a = T._writableStreamController;
  T._state = "erroring", T._storedError = R;
  let e = T._writer;
  e !== void 0 && lHT(e, R), !function (t) {
    if (t._inFlightWriteRequest === void 0 && t._inFlightCloseRequest === void 0) return !1;
    return !0;
  }(T) && a._started && w3T(T);
}