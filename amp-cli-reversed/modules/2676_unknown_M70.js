function M70(T, R, a, e) {
  let t = (R & jt.BRANCH_LENGTH) >> 7,
    r = R & jt.JUMP_TABLE;
  if (t === 0) return r !== 0 && e === r ? a : -1;
  if (r) {
    let s = e - r;
    return s < 0 || s >= t ? -1 : T[a + s] - 1;
  }
  let h = t + 1 >> 1,
    i = 0,
    c = t - 1;
  while (i <= c) {
    let s = i + c >>> 1,
      A = s >> 1,
      l = T[a + A] >> (s & 1) * 8 & 255;
    if (l < e) i = s + 1;else if (l > e) c = s - 1;else return T[a + h + s];
  }
  return -1;
}