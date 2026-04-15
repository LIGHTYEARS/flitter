function A00(T, R) {
  let a,
    e = R.length * 2,
    t = T.length - e;
  R.sort((r, h) => r.offset > h.offset ? 1 : -1);
  for (let r = 0; r < R.length; r++) {
    let h = R[r];
    h.id = r;
    for (let i of h.references) T[i++] = r >> 8, T[i] = r & 255;
  }
  while (a = R.pop()) {
    let r = a.offset;
    T.copyWithin(r + e, r, t), e -= 2;
    let h = r + e;
    T[h++] = 216, T[h++] = 28, t = r;
  }
  return T;
}