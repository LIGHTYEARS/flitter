function rx0(T, R) {
  let a = {};
  for (let e = 0; e < T.length; e++) {
    let t = T[e],
      r = R[e];
    if (t.required && r === void 0) throw new Gw(`Missing required argument: <${t.name}>`);
    a[t.name] = r;
  }
  return a;
}