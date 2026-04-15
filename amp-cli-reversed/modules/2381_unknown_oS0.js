function oS0(T, R) {
  let a;
  return e;
  function e(...h) {
    let i = T.length > h.length,
      c;
    if (i) h.push(t);
    try {
      c = T.apply(this, h);
    } catch (s) {
      let A = s;
      if (i && a) throw A;
      return t(A);
    }
    if (!i) if (c && c.then && typeof c.then === "function") c.then(r, t);else if (c instanceof Error) t(c);else r(c);
  }
  function t(h, ...i) {
    if (!a) a = !0, R(h, ...i);
  }
  function r(h) {
    t(null, h);
  }
}