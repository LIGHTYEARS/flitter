function nC0(T, R) {
  let a = 0,
    e = 0,
    t = -1;
  while (a < T.length && e < R.length) {
    if (T[a] === R[e]) {
      if (t === -1) t = a;
      e++;
    }
    a++;
  }
  if (e === R.length) return 250 - Math.min(t, 150);
  return 0;
}