function qI(T, R, a, e, t) {
  if (t) {
    let r = T.length - R.length;
    if (r >= a) {
      let h = !0;
      for (let i = 0; i < R.length; i++) if (!e(T[r + i], R[i])) {
        h = !1;
        break;
      }
      if (h) return r;
    }
  }
  for (let r = a; r <= T.length - R.length; r++) {
    let h = !0;
    for (let i = 0; i < R.length; i++) if (!e(T[r + i], R[i])) {
      h = !1;
      break;
    }
    if (h) return r;
  }
  return -1;
}