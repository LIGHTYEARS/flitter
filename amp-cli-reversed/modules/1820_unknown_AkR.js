async function AkR(T, R, a, e, t) {
  let r = [];
  a = _kR(a);
  let h = /@([a-zA-Z0-9._~/*?[\]{}\\,-]+)/g,
    i;
  while ((i = h.exec(a)) !== null) {
    let c = i[1];
    if (!c) continue;
    c = c.replace(/[.,;!?)]+$/, ""), c = c.replace(/\\(\*)/g, "$1");
    let s = pkR(c, R);
    if (s) {
      J.warn("Ignoring glob pattern:", s);
      continue;
    }
    try {
      let A = await bkR(T, R, c, e, t);
      r.push(...A);
    } catch (A) {}
  }
  return r;
}