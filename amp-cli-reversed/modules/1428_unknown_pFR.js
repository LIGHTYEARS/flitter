async function pFR(T, R, a, e = null) {
  let t = new Map(),
    r = R,
    h = new Set();
  while (!Q9T(r)) {
    let i = r.toString();
    if (h.has(i)) break;
    if (h.add(i), await NuT(T, t, MR.joinPath(r, oFR, NX), {
      type: "dir",
      path: r
    }), a.some(c => c.toString() === r.toString())) break;
    r = MR.dirname(r);
  }
  for (let i of _FR(e)) await NuT(T, t, i.checksDir, i.scopeDir);
  return Array.from(t.values());
}