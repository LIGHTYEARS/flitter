// Module: ldexp
// Original: pZ
// Type: CJS (RT wrapper)
// Exports: ldexp, nextGreaterSquare
// Category: util

// Module: pZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.nextGreaterSquare = T.ldexp = void 0));
  function R(e, t) {
    if (
      e === 0 ||
      e === Number.POSITIVE_INFINITY ||
      e === Number.NEGATIVE_INFINITY ||
      Number.isNaN(e)
    )
      return e;
    return e * Math.pow(2, t);
  }
  T.ldexp = R;
  function a(e) {
    return (
      e--,
      (e |= e >> 1),
      (e |= e >> 2),
      (e |= e >> 4),
      (e |= e >> 8),
      (e |= e >> 16),
      e++,
      e
    );
  }
  T.nextGreaterSquare = a;
};
