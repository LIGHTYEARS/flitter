function LgT(T) {
  let R = {};
  for (let a of T.split(",")) {
    let e = a.indexOf(":");
    if (e > 0) {
      let t = a.slice(0, e).trim(),
        r = a.slice(e + 1).trim();
      if (t && r) R[t] = r;
    }
  }
  return R;
}