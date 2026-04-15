function WC0(T) {
  let R = {};
  for (let a = 0; a < T.length; a++) {
    let e = T[a];
    if (e && e.startsWith("--")) {
      let t = e.slice(2),
        r = T[a + 1];
      if (r && !r.startsWith("--")) R[t] = r, a++;
    }
  }
  return R;
}