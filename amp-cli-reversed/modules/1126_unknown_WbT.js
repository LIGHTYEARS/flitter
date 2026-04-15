function UC(T) {
  return TypeError(`ReadableStreamDefaultController.prototype.${T} can only be used on a ReadableStreamDefaultController`);
}
function ZLR(T, R, a) {
  return Mc(T, a), e => Em(T, R, [e]);
}
function JLR(T, R, a) {
  return Mc(T, a), e => Em(T, R, [e]);
}
function TMR(T, R, a) {
  return Mc(T, a), e => gU(T, R, [e]);
}
function RMR(T, R) {
  if ((T = `${T}`) !== "bytes") throw TypeError(`${R} '${T}' is not a valid enumeration value for ReadableStreamType`);
  return T;
}
function aMR(T, R) {
  if ((T = `${T}`) !== "byob") throw TypeError(`${R} '${T}' is not a valid enumeration value for ReadableStreamReaderMode`);
  return T;
}
function WbT(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.preventAbort,
    e = T == null ? void 0 : T.preventCancel,
    t = T == null ? void 0 : T.preventClose,
    r = T == null ? void 0 : T.signal;
  return r !== void 0 && function (h, i) {
    if (!function (c) {
      if (typeof c != "object" || c === null) return !1;
      try {
        return typeof c.aborted == "boolean";
      } catch (s) {
        return !1;
      }
    }(h)) throw TypeError(`${i} is not an AbortSignal.`);
  }(r, `${R} has member 'signal' that`), {
    preventAbort: Boolean(a),
    preventCancel: Boolean(e),
    preventClose: Boolean(t),
    signal: r
  };
}