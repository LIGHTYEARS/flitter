function v3(...T) {
  if (T.length === 0) return P0T;
  return new AR(R => {
    let a = Array(T.length),
      e = Array(T.length).fill(0),
      t = Array(T.length).fill(!1),
      r = 0,
      h = [],
      i = new FS(R);
    for (let c = 0; c < T.length; c++) {
      let s = T[c];
      h.push(s.subscribe({
        next(A) {
          a[c] = A, t[c] = !0;
          let l = ++e[c];
          if (t.every(Boolean)) i.schedule(async o => {
            if (e[c] === l) o([...a]);
          });
        },
        error(A) {
          i.error(A);
        },
        complete() {
          if (r++, r === T.length) i.complete();
        }
      }));
    }
    return () => {
      iET(h);
    };
  });
}