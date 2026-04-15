function Tj0(T, R) {
  let a = R || {};
  function e(t, ...r) {
    let {
      invalid: h,
      handlers: i
    } = e;
    if (t && zfT.call(t, T)) {
      let c = String(t[T]);
      h = zfT.call(i, c) ? i[c] : e.unknown;
    }
    if (h) return h.call(this, t, ...r);
  }
  return e.handlers = a.handlers || {}, e.invalid = a.invalid, e.unknown = a.unknown, e;
}