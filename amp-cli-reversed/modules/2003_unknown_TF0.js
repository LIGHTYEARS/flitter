function TF0(T) {
  let R = {};
  for (let a = 0; a < T.length; a++) {
    let e = T[a];
    if (e?.startsWith("--")) {
      let t = e.slice(2).replace(/-([a-z])/g, (h, i) => i.toUpperCase()),
        r = T[a + 1];
      if (r && !r.startsWith("--")) R[t] = r, a++;
    }
  }
  return R;
}