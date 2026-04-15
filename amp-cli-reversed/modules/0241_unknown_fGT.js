function fGT(T, R) {
  let a = this.buildAllMatchers(),
    e = (t, r) => {
      let h = a[t] || a[ta],
        i = h[2][r];
      if (i) return i;
      let c = r.match(h[0]);
      if (!c) return [[], $eT];
      let s = c.indexOf("", 1);
      return [h[1][s], c];
    };
  return this.match = e, e(T, R);
}