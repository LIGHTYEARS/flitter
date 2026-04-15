function PK(T, R, a, e, t) {
  if (e >= R.length) return;
  if (typeof T !== "object" || T === null) return;
  let r = R[e];
  if (r.endsWith("[]")) {
    let h = r.slice(0, -2),
      i = T;
    if (h in i && Array.isArray(i[h])) for (let c of i[h]) PK(c, R, a, e + 1, t);
  } else if (r === "*") {
    if (typeof T === "object" && T !== null && !Array.isArray(T)) {
      let h = T,
        i = Object.keys(h).filter(s => !s.startsWith("_") && !t.has(s)),
        c = {};
      for (let s of i) c[s] = h[s];
      for (let [s, A] of Object.entries(c)) {
        let l = [];
        for (let o of a.slice(e)) if (o === "*") l.push(s);else l.push(o);
        Y(h, l, A);
      }
      for (let s of i) delete h[s];
    }
  } else {
    let h = T;
    if (r in h) PK(h[r], R, a, e + 1, t);
  }
}