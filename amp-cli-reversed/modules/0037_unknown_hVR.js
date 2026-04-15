function hVR(T, R) {
  let a = T.length,
    e = R.length;
  if (e > a) return -1;
  for (let t = 0; t <= a - e; t++) {
    let r = !0;
    for (let h = 0; h < e; h++) if (T[t + h] !== R[h]) {
      r = !1;
      break;
    }
    if (r) return t;
  }
  return -1;
}