function rgR(T = []) {
  return new _n(T.reduce((R, a, e, t) => {
    if (e % 2 === 0) R.push(t.slice(e, e + 2));
    return R;
  }, []).filter(([R, a]) => {
    try {
      return Jg(R), HL(R, String(a)), !0;
    } catch {
      return !1;
    }
  }));
}