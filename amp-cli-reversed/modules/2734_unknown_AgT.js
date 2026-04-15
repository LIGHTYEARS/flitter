function eU0(T) {
  let R = T.codePointAt(0) ?? 0;
  return R >= mRR && R <= 10495;
}
function AgT(T) {
  if (T.length <= 1) return T;
  let R = "",
    a = T[0];
  T: for (let r = 0; r < a.length; r++) {
    let h = a[r];
    for (let i = 1; i < T.length; i++) if (T[i][r] !== h) break T;
    R += h;
  }
  if (R.length === 0) return T;
  let e = Math.max(R.lastIndexOf("-"), R.lastIndexOf("/"), R.lastIndexOf(" ")),
    t = e >= 0 ? e + 1 : R.length;
  if (t <= 0) return T;
  if (Math.min(...T.map(r => r.length)) - t < 2) return T;
  return T.map(r => r.slice(t));
}