function HC(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_controlledTransformStream") && T instanceof Bl;
}
function kHT(T) {
  T._transformAlgorithm = void 0, T._flushAlgorithm = void 0;
}
function xHT(T, R) {
  let a = T._controlledTransformStream;
  if (!Y7(a)) throw TypeError("Readable side is not in a state that permits enqueue");
  try {
    (function (e, t) {
      e._readablePulling = !1;
      try {
        e._readableController.enqueue(t);
      } catch (r) {
        throw Q7(e, r), r;
      }
    })(a, R);
  } catch (e) {
    throw jU(a, e), a._readableStoredError;
  }
  (function (e) {
    return !function (t) {
      if (!Y7(t)) return !1;
      if (t._readablePulling) return !0;
      if (IHT(t) > 0) return !0;
      return !1;
    }(e);
  })(a) !== a._backpressure && X7(a, !0);
}