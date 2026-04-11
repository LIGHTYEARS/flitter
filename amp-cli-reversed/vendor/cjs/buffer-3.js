// Module: buffer-3
// Original: pN
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: pN (CJS)
(T, R) => {
  var { EMPTY_BUFFER: a } = GA(),
    e = Buffer[Symbol.species];
  function t(s, A) {
    if (s.length === 0) return a;
    if (s.length === 1) return s[0];
    let l = Buffer.allocUnsafe(A),
      o = 0;
    for (let n = 0; n < s.length; n++) {
      let p = s[n];
      (l.set(p, o), (o += p.length));
    }
    if (o < A) return new e(l.buffer, l.byteOffset, o);
    return l;
  }
  function r(s, A, l, o, n) {
    for (let p = 0; p < n; p++) l[o + p] = s[p] ^ A[p & 3];
  }
  function h(s, A) {
    for (let l = 0; l < s.length; l++) s[l] ^= A[l & 3];
  }
  function i(s) {
    if (s.length === s.buffer.byteLength) return s.buffer;
    return s.buffer.slice(s.byteOffset, s.byteOffset + s.length);
  }
  function c(s) {
    if (((c.readOnly = !0), Buffer.isBuffer(s))) return s;
    let A;
    if (s instanceof ArrayBuffer) A = new e(s);
    else if (ArrayBuffer.isView(s))
      A = new e(s.buffer, s.byteOffset, s.byteLength);
    else ((A = Buffer.from(s)), (c.readOnly = !1));
    return A;
  }
  if (
    ((R.exports = {
      concat: t,
      mask: r,
      toArrayBuffer: i,
      toBuffer: c,
      unmask: h,
    }),
    !process.env.WS_NO_BUFFER_UTIL)
  )
    try {
      let s = ApR();
      ((R.exports.mask = function (A, l, o, n, p) {
        if (p < 48) r(A, l, o, n, p);
        else s.mask(A, l, o, n, p);
      }),
        (R.exports.unmask = function (A, l) {
          if (A.length < 32) h(A, l);
          else s.unmask(A, l);
        }));
    } catch (s) {}
};
