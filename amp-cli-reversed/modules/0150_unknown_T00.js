function T00(T) {
  let R = CR,
    a = Array(T);
  for (let e = 0; e < T; e++) {
    let t = L0[CR++];
    if ((t & 128) > 0) {
      CR = R;
      return;
    }
    a[e] = t;
  }
  return le.apply(String, a);
}