function Km() {
  return 2 ** ++Gx0;
}
function ofT(T, R, a) {
  if (a) T[R] = a;
}
function af(T) {
  let R = {},
    a = {};
  for (let [e, t] of Object.entries(T.properties)) {
    let r = new MH(e, T.transform(T.attributes || {}, e), t, T.space);
    if (T.mustUseProperty && T.mustUseProperty.includes(e)) r.mustUseProperty = !0;
    R[e] = r, a[PS(e)] = e, a[PS(r.attribute)] = e;
  }
  return new Rf(R, a, T.space);
}