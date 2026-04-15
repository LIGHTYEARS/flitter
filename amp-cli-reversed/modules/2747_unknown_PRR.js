function PRR(T, R) {
  let a = T.length,
    e = [];
  for (let r = 0; r < a - 1; r++) {
    let h = T[r + 1] - T[r];
    e.push(h === 0 ? 0 : (R[r + 1] - R[r]) / h);
  }
  let t = Array(a).fill(0);
  t[0] = e[0], t[a - 1] = e[a - 2];
  for (let r = 1; r < a - 1; r++) {
    let h = e[r - 1],
      i = e[r];
    if (h * i <= 0) t[r] = 0;else t[r] = (h + i) / 2;
  }
  for (let r = 0; r < a - 1; r++) {
    let h = e[r];
    if (h === 0) t[r] = 0, t[r + 1] = 0;else {
      let i = t[r] / h,
        c = t[r + 1] / h,
        s = i * i + c * c;
      if (s > 9) {
        let A = 3 / Math.sqrt(s);
        t[r] = A * i * h, t[r + 1] = A * c * h;
      }
    }
  }
  return {
    xs: T,
    ys: R,
    m: t
  };
}