function gf0(T, R, a, e) {
  let t = (R & tA.BRANCH_LENGTH) >> 7,
    r = R & tA.JUMP_TABLE;
  if (t === 0) return r !== 0 && e === r ? a : -1;
  if (r) {
    let c = e - r;
    return c < 0 || c >= t ? -1 : T[a + c] - 1;
  }
  let h = a,
    i = h + t - 1;
  while (h <= i) {
    let c = h + i >>> 1,
      s = T[c];
    if (s < e) h = c + 1;else if (s > e) i = c - 1;else return T[c + t];
  }
  return -1;
}