function oC0(T, R) {
  if (T === R) return 800;
  if (T.startsWith(R)) return 700;
  let a = T.indexOf(R);
  if (a !== -1) return 600 - Math.min(a, 500);
  let e = nC0(T, R);
  if (e > 0) return e;
  return 0;
}