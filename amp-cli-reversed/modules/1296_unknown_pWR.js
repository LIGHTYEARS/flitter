function pWR(T, R, a) {
  return qR.default((e, t) => {
    let r = [],
      h = t;
    if (a._(e, h).status) return qR.default.makeFailure(h, ["at least one match before terminator"]);
    let i = T._(e, h);
    if (!i.status) return i;
    r.push(i.value), h = i.index;
    while (!0) {
      if (a._(e, h).status) break;
      let c = R._(e, h);
      if (!c.status) break;
      h = c.index;
      let s = T._(e, h);
      if (!s.status) break;
      r.push(s.value), h = s.index;
    }
    return qR.default.makeSuccess(h, r);
  });
}