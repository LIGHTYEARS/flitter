function tx(T, R, a, e, t, r) {
  if (e === 0) return setImmediate(function () {
    r(null, In(0));
  });
  T.read(R, a, e, t, function (h, i) {
    if (h) return r(h);
    if (i < e) return r(Error("unexpected EOF"));
    r();
  });
}