function qhT(T, R, a) {
  let e = new Map(),
    t;
  for (let i of R.issues) if (i.code === "unrecognized_keys") {
    t ?? (t = i);
    for (let c of i.keys) {
      if (!e.has(c)) e.set(c, {});
      e.get(c).l = !0;
    }
  } else T.issues.push(i);
  for (let i of a.issues) if (i.code === "unrecognized_keys") for (let c of i.keys) {
    if (!e.has(c)) e.set(c, {});
    e.get(c).r = !0;
  } else T.issues.push(i);
  let r = [...e].filter(([, i]) => i.l && i.r).map(([i]) => i);
  if (r.length && t) T.issues.push({
    ...t,
    keys: r
  });
  if (z_(T)) return T;
  let h = A2(R.value, a.value);
  if (!h.valid) throw Error(`Unmergable intersection. Error path: ${JSON.stringify(h.mergeErrorPath)}`);
  return T.value = h.data, T;
}