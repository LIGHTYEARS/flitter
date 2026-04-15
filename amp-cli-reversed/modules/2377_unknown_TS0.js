function TS0(T) {
  let R = T || {},
    a = R.now || {},
    e = R.lineShift || 0,
    t = a.line || 1,
    r = a.column || 1;
  return {
    move: c,
    current: h,
    shift: i
  };
  function h() {
    return {
      now: {
        line: t,
        column: r
      },
      lineShift: e
    };
  }
  function i(s) {
    e += s;
  }
  function c(s) {
    let A = s || "",
      l = A.split(/\r?\n|\r/g),
      o = l[l.length - 1];
    return t += l.length - 1, r = l.length === 1 ? r + o.length : 1 + o.length + e, A;
  }
}