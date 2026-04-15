function PtT(T, R, a) {
  let e = `${T},${R},${a}`,
    t = jxT.get(e);
  if (t !== void 0) return t;
  let r = 16,
    h = 1 / 0;
  for (let i = 0; i < vxT.length; i++) {
    let [c, s, A] = vxT[i],
      l = (T - c) ** 2 + (R - s) ** 2 + (a - A) ** 2;
    if (l < h) h = l, r = i + 16;
  }
  return jxT.set(e, r), r;
}