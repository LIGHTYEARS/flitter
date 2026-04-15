async function uFR(T, R, a, e, t = null) {
  let r = new Map(),
    h = new Map(),
    i = new Map();
  for (let s of R) {
    let A = s.includes("/") ? s.substring(0, s.lastIndexOf("/")) : "",
      l = i.get(A) ?? [];
    l.push(s), i.set(A, l);
  }
  let c = new Map();
  for (let s of i.keys()) {
    let A = s ? MR.joinPath(a, s) : a,
      l = await pFR(T, A, e, t);
    c.set(s, l);
    for (let o of l) if (!r.has(o.name)) r.set(o.name, o);
  }
  for (let [s, A] of i.entries()) {
    let l = c.get(s) ?? [];
    for (let o of A) h.set(o, l);
  }
  return {
    allChecks: Array.from(r.values()),
    checksPerFile: h
  };
}