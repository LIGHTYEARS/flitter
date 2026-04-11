// Module: encode-as-long-bits
// Original: gZ
// Type: CJS (RT wrapper)
// Exports: encodeAsLongBits, encodeAsString, getOtlpEncoder, hrTimeToNanos, toLongBits
// Category: util

// Module: gZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getOtlpEncoder =
      T.encodeAsString =
      T.encodeAsLongBits =
      T.toLongBits =
      T.hrTimeToNanos =
        void 0));
  var R = $9(),
    a = nrR();
  function e(o) {
    let n = BigInt(1e9);
    return BigInt(Math.trunc(o[0])) * n + BigInt(Math.trunc(o[1]));
  }
  T.hrTimeToNanos = e;
  function t(o) {
    let n = Number(BigInt.asUintN(32, o)),
      p = Number(BigInt.asUintN(32, o >> BigInt(32)));
    return { low: n, high: p };
  }
  T.toLongBits = t;
  function r(o) {
    let n = e(o);
    return t(n);
  }
  T.encodeAsLongBits = r;
  function h(o) {
    return e(o).toString();
  }
  T.encodeAsString = h;
  var i = typeof BigInt < "u" ? h : R.hrTimeToNanoseconds;
  function c(o) {
    return o;
  }
  function s(o) {
    if (o === void 0) return;
    return (0, a.hexToBinary)(o);
  }
  var A = {
    encodeHrTime: r,
    encodeSpanContext: a.hexToBinary,
    encodeOptionalSpanContext: s,
  };
  function l(o) {
    if (o === void 0) return A;
    let n = o.useLongBits ?? !0,
      p = o.useHex ?? !1;
    return {
      encodeHrTime: n ? r : i,
      encodeSpanContext: p ? c : a.hexToBinary,
      encodeOptionalSpanContext: p ? c : s,
    };
  }
  T.getOtlpEncoder = l;
};
