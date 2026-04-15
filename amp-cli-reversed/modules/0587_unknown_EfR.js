function EfR(T) {
  if (!T || typeof T !== "string") return T;
  let R = Zg.get(T);
  if (R !== void 0) return R;
  let a = dfR(T);
  for (let e of PwT) {
    if (!e.keywords.some(r => e.caseInsensitive ? a.toLowerCase().includes(r.toLowerCase()) : a.includes(r))) continue;
    let t = SfR(e);
    a = a.replace(t, (r, h) => {
      return r.replace(h, `[REDACTED:${e.id}]`);
    });
  }
  if (T.length <= LfR) {
    if (Zg.size >= CfR) Zg.clear();
    Zg.set(T, a);
  }
  return a;
}