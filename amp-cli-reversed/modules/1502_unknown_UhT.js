function UhT(T, R, a, e, t, r) {
  let h = [],
    i = t.keySet,
    c = t.catchall._zod,
    s = c.def.type,
    A = c.optout === "optional";
  for (let l in R) {
    if (i.has(l)) continue;
    if (s === "never") {
      h.push(l);
      continue;
    }
    let o = c.run({
      value: R[l],
      issues: []
    }, e);
    if (o instanceof Promise) T.push(o.then(n => sD(n, a, l, R, A)));else sD(o, a, l, R, A);
  }
  if (h.length) a.issues.push({
    code: "unrecognized_keys",
    keys: h,
    input: R,
    inst: r
  });
  if (!T.length) return a;
  return Promise.all(T).then(() => {
    return a;
  });
}